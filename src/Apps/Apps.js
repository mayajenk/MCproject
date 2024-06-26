// Apps.js
import React, { useRef, useEffect, useState} from 'react';
import Blockly from 'blockly';
import { Button } from 'react-bootstrap';
import { saveAs } from 'file-saver';
import { Modal } from 'react-bootstrap'
import AppManager from '../AppManager';
import {javascriptGenerator, Order} from 'blockly/javascript';


// a service block that can attach into an input
Blockly.Blocks['service_block_conditional'] = {
  // Container.
  init: function() {
    this.setColour(230);
    this.appendDummyInput()
        .appendField('SERVICE NAME', 'SERVICE_NAME');
    this.appendValueInput('SERVICE_PARAM_INPUT')
        .appendField('Parameters: ');
    this.setTooltip('Service block.');
    this.setOutput(true, [this, this.getChildren(false)]);
    this.contextMenu = false;
  }
};

Blockly.Blocks['field_dropdown_container'] = {
  // Container.
  init: function() {
    this.setColour(160);
    this.appendDummyInput()
        .appendField('add options');
    this.appendStatementInput('STACK');
    this.setTooltip('Add, remove, or reorder options\n' +
                    'to reconfigure this dropdown menu.');
    this.contextMenu = false;
  }
};

Blockly.Blocks['field_dropdown_option_text'] = {
  // Add text option.
  init: function() {
    this.setColour(160);
    this.appendDummyInput()
        .appendField('text option');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Add a new text option to the dropdown menu.');
    this.setHelpUrl('https://www.youtube.com/watch?v=s2_xaEvcVI0#t=386');
    this.contextMenu = false;
  }
};

//the parameter block
Blockly.Blocks['field_dropdown'] = {
  // Dropdown menu.
  init: function() {
    this.appendDummyInput()
        .appendField('parameters')
    this.optionList_ = ['text'];
    this.updateShape_();
    this.setOutput(true, this.userData_);
    this.setMutator(new Blockly.icons.MutatorIcon(['field_dropdown_option_text'], this));
    this.setColour(160);
    this.setTooltip('Dropdown menu with a list of options.');
  },
  mutationToDom: function(workspace) {
    // Create XML to represent menu options.
    var container = Blockly.utils.xml.createElement('mutation');
    container.setAttribute('options', JSON.stringify(this.optionList_));
    return container;
  },
  domToMutation: function(container) {
    // Parse XML to restore the menu options.
    var value = JSON.parse(container.getAttribute('options'));
    if (typeof value === 'number') {
      // Old format from before images were added.  November 2016.
      this.optionList_ = [];
      for (var i = 0; i < value; i++) {
        this.optionList_.push('text');
      }
    } else {
      this.optionList_ = value;
    }
    this.updateShape_();
  },
  decompose: function(workspace) {
    // Populate the mutator's dialog with this block's components.
    var containerBlock = workspace.newBlock('field_dropdown_container');
    containerBlock.initSvg();
    var connection = containerBlock.getInput('STACK').connection;
    for (var i = 0; i < this.optionList_.length; i++) {
      var optionBlock = workspace.newBlock(
          'field_dropdown_option_' + this.optionList_[i]);
      optionBlock.initSvg();
      connection.connect(optionBlock.previousConnection);
      connection = optionBlock.nextConnection;
    }
    return containerBlock;
  },
  compose: function(containerBlock) {
    // Reconfigure this block based on the mutator dialog's components.
    var optionBlock = containerBlock.getInputTargetBlock('STACK');
    // Count number of inputs.
    this.optionList_.length = 0;
    var data = [];
    while (optionBlock) {
      if (optionBlock.type === 'field_dropdown_option_text') {
        this.optionList_.push('text');
      }
      data.push(optionBlock.userData_);
      optionBlock = optionBlock.nextConnection &&
          optionBlock.nextConnection.targetBlock();
    }
    this.updateShape_();
    // Restore any data.
    for (var i = 0; i < this.optionList_.length; i++) {
      var userData = data[i];
      if (userData !== undefined) {
          this.setFieldValue(userData, 'USER' + i);
      }
    }
  },
  saveConnections: function(containerBlock) {
    // Store all data for each option.
    var optionBlock = containerBlock.getInputTargetBlock('STACK');
    var i = 0;
    while (optionBlock) {
      optionBlock.userData_ = this.getUserData(i);
      i++;
      optionBlock = optionBlock.nextConnection &&
          optionBlock.nextConnection.targetBlock();
    }
  },
  updateShape_: function() {
    // Delete everything.
    var i = 0;
    while (this.getInput('OPTION' + i)) {
      this.removeInput('OPTION' + i);
      this.removeInput('OPTION_IMAGE' + i, true);
      i++;
    }
    // Rebuild block.
    var src = 'https://www.gstatic.com/codesite/ph/images/star_on.gif';
    for (var i = 0; i <= this.optionList_.length; i++) {
      var type = this.optionList_[i];
      if (type === 'text') {
        this.appendDummyInput('OPTION' + i)
            .appendField('•')
            .appendField('Parameter '+ i +':')
            .appendField(new Blockly.FieldNumber(), 'USER' + i);
      }
    }
  },
  onchange: function() {
    if (this.workspace && this.optionList_.length < 1) {
      this.setWarningText('Drop down menu must\nhave at least one option.');
    } else {
      fieldNameCheck(this);
    }
  },
  getUserData: function(n) {
    if (this.optionList_[n] === 'text') {
      return this.getFieldValue('USER' + n);
    }
   
    throw 'Unknown dropdown type';
  }

};

javascriptGenerator.forBlock[`field_dropdown`]  = function(block, generator) {

  // get all of the parameters
  let paramName = "USER";
  let i = 0;
  var paramList = [];
  
  while(block.getFieldValue(paramName+i) != null)
  {
    paramList.push(block.getFieldValue(paramName+i));
    i++;

  }

  // Return code.
  return [paramList.toString(), Order.NONE];

}


Blockly.Blocks['start_block'] =
{
  init: function() {
    this.setColour(315);
    this.appendDummyInput()
        .appendField('Start');
    this.appendStatementInput('START_STATEMENT_INPUT')
    this.setTooltip('Drag blocks into here to start the program');
    this.contextMenu = false;
  }
};

function fieldNameCheck(referenceBlock) {
  if (!referenceBlock.workspace) {
    // Block has been deleted.
    return;
  }
  var name = referenceBlock.name
  var count = 0;
  var blocks = referenceBlock.workspace.getAllBlocks(false);
  for (var i = 0, block; block = blocks[i]; i++) {
    var otherName = block.getFieldValue('FIELDNAME');
    if (!block.disabled && !block.getInheritedDisabled() &&
        otherName && otherName.toLowerCase() === name) {
      count++;
    }
  }
  var msg = (count > 1) ?
      'There are ' + count + ' field blocks\n with this name.' : null;
  referenceBlock.setWarningText(msg);
}

function Apps({apps, setApps, relationships, services}) {
  const workspaceRef = useRef(null);
  const [blocklyWorkspace, setWorkspace] = useState(null);
  const [currentServices, setServices] = useState(null);
  const [appSaved, setAppSaved] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [showModal, setShowModal] = useState(true);
  const [showManager, setShowManager] = useState(false);
  const [relationshipBlocks, setRelationshipBlocks] = useState([])

  useEffect(() => { 
    console.log("relationships", relationships)
    console.log("services", services);
    let newXML = `<category name="Conditional" colour="#5CA68D">`
    let orderBasedXML = `<category name="Order-Based" colour="#5C68A6">`
    let conditionalXML = `<category name="Conditional" colour="#5CA68D">`
    let parameterXML = `<category name="Parameter" colour="#5CA65C"><block type="field_dropdown"></block></category>`
    let serviceXML = `<category name="Sequential" colour="#5CA65C">`


    //creating the service blocks (TODO: CURRENTLY UNUSED)
    for(let i = 0; i < services.length; i++){
      console.log(services)
      // a service block that can attach into an input. the first one in the if
      Blockly.Blocks[services[i].serviceName] = {
        init: function() {
          this.setColour(230);
          this.appendDummyInput()
              .appendField(`${services[i].serviceName}`, 'SERVICE_NAME');
            
          //it returns a value
          if(services[i].serviceOutput !== "NULL"){
            this.appendDummyInput()
              .appendField('==')
              .appendField(new Blockly.FieldNumber(), 'CONDITION_RESULT_CHECK')
          }

          //if it returns a value
          if(services[i].serviceInput[0] !== "NULL"){
            this.appendValueInput(`${services[i].serviceName}_PARAM_INPUT`)
            .appendField('Parameters: ');
          }
          this.setTooltip('Service block.');
          this.setOutput(true);
          this.setPreviousStatement(true);
          this.setNextStatement(true);
          this.contextMenu = false;
        }
      };
      javascriptGenerator.forBlock[`${services[i].serviceName}`]  = function(block, generator) {
        // Collect argument strings.
        const serviceName = block.getFieldValue('SERVICE_NAME');
        const parameterBlock = block.getInputTargetBlock(`${services[i].serviceName}_PARAM_INPUT`);
        var innerCode = generator.blockToCode(parameterBlock, true)[0];
  
        if(innerCode == undefined)
          innerCode = "";
  
        //it returns a value
        if(services[i].serviceOutput !== "NULL")
        {
          return `runService("${serviceName}", "${innerCode}");`;
        }
        //does not return a value
        else
        {
          return `runService("${serviceName}", "${innerCode}");`;
        }
  
      }
      serviceXML += `<block type="${services[i].serviceName}"></block>`
    }

    //beginning the toolbox XML
    let fullXml=
`      <xml id="toolbox" style="display: none;">
      ${serviceXML}
      </category>
      <category name="Order-Based" colour="#5C68A6">`;

      //add the order-based relationship blocks
      relationships.forEach((relationship) => {
        if (relationship.type === 'orderBased') {

          //the first service block, named after the first service in the relationship
          Blockly.Blocks[`${relationship.service1}_${relationship.name}_service_block_order_1`] = {
            init: function() {
              this.setColour(230);
              this.appendDummyInput()
                  .appendField(`${relationship.service1}`, 'SERVICE_NAME');
              this.appendValueInput(`${relationship.service1}_PARAM_INPUT`)
                  .appendField('Parameters: ');
              this.setPreviousStatement(true);
              this.setTooltip('Service block.');
              this.contextMenu = false;
              this.setMovable(false); //makes the user unable to disconnect this relationship

            }
          };
          //the second service block, in the "Then clause"
          Blockly.Blocks[`${relationship.service2}_${relationship.name}_service_block_order_2`] = {
            init: function() {
              this.setColour(230);
              this.appendDummyInput()
                  .appendField(`${relationship.service2}`, 'SERVICE_NAME');
              this.appendValueInput(`${relationship.service2}_PARAM_INPUT`)
                  .appendField('Parameters: ');
              this.setPreviousStatement(true);
              this.setTooltip('Service block.');
              this.contextMenu = false;
              this.setMovable(false);
            }
          };
          // takes in two service_block_orders as input
          Blockly.Blocks[`${relationship.name}_orderBased`] = {
            init: function() {
              this.setColour(0);
              this.appendDummyInput()
                .appendField('First run');
              this.appendStatementInput('FIRST_STATEMENT')
              this.appendDummyInput()
                .appendField('then run');
              this.appendStatementInput('SECOND_STATEMENT')
              this.setNextStatement(true);
              this.setPreviousStatement(true);
              this.setEditable(false);
            }
          };
          createOrderBasedCode(relationship);
          //combine all three blocks together in the XML
          fullXml += `
          <block type="${relationship.name}_orderBased">
            <statement name="FIRST_STATEMENT">
              <field>First run</field>
              <block type="${relationship.service1}_${relationship.name}_service_block_order_1">
              </block>
            </statement>
            <statement name="SECOND_STATEMENT">
              <field>Then run</field>
              <block type="${relationship.service2}_${relationship.name}_service_block_order_2">
              </block>
            </statement>
          </block>`;
        }
      });

      //creating new toolbox category for the conditionals
      fullXml += `
          </category>
          <category name="Conditional" colour="#5CA68D">`;

      // Add blocks for each relationship under "Conditional"
      relationships.forEach((relationship) => {
       
        if (relationship.type !== 'orderBased') {
          
          // a service block that can attach into an input. the first one in the if
          Blockly.Blocks[`${relationship.service1}_${relationship.name}_service_block_conditional_1`] = {
            init: function() {
              this.setColour(230);
              this.appendDummyInput()
                  .appendField(`${relationship.service1}`, 'SERVICE_NAME');
              this.appendValueInput(`${relationship.service1}_PARAM_INPUT`)
                  .appendField('Parameters: ');
              this.setTooltip('Service block.');
              this.setOutput(true, [this, this.getChildren(false)]);
              this.setMovable(false);
              this.contextMenu = false;
            }
          };
        //the second service block, in the "Then clause"
        Blockly.Blocks[`${relationship.service2}_${relationship.name}_service_block_conditional_2`] = {
          init: function() {
            this.setColour(230);
            this.appendDummyInput()
                .appendField(`${relationship.service2}`, 'SERVICE_NAME');
            this.appendValueInput(`${relationship.service2}_PARAM_INPUT`)
                .appendField('Parameters: ');
            this.setPreviousStatement(true);
            this.setTooltip('Service block.');
            this.contextMenu = false;
            this.setMovable(false);
          }
        };

          // takes in two service_block_orders as input, as well as a number to check the result of the first statement
          Blockly.Blocks[`${relationship.name}_conditional`] = {
            init: function() {
              this.setColour(0);
              this.appendDummyInput()
                .appendField('If');
              this.appendValueInput('FIRST_STATEMENT')
              this.appendDummyInput()
                .appendField('==')
                .appendField(new Blockly.FieldNumber(), 'CONDITION_RESULT_CHECK')
                .appendField(', then run');
              this.appendStatementInput('SECOND_STATEMENT')
              this.setNextStatement(true);
              this.setPreviousStatement(true);
              this.setEditable(true);
            }
          };

          createConditionalCode(relationship);

          
          //combine all three blocks together in the XML
          fullXml += `
          <block type="${relationship.name}_conditional">
            <statement name="FIRST_STATEMENT">
              <field>If</field>
              <block type="${relationship.service1}_${relationship.name}_service_block_conditional_1">
              </block>
            </statement>
            <statement name="SECOND_STATEMENT">
              <field>, then run</field>
              <block type="${relationship.service2}_${relationship.name}_service_block_conditional_2">
              </block>
            </statement>
          </block>`;

        }
      });


      fullXml += `
          </category>
          ${parameterXML}
        </xml>`;
    
      
    const workspace = Blockly.inject(workspaceRef.current, {
      toolbox: fullXml,
    });

    setWorkspace(workspace);
    setServices(services);

    workspace.addChangeListener(() => {
      setAppSaved(false);
    });
  
    return () => {
      workspace.dispose();
    };
  }, []);

  function createOrderBasedCode(relationship)
  {

    //service 1's code
    javascriptGenerator.forBlock[`${relationship.service1}_${relationship.name}_service_block_order_1`]  = function(block, generator) {
      // Collect argument strings.
      const serviceName = block.getFieldValue('SERVICE_NAME');
      const parameterBlock = block.getInputTargetBlock(`${relationship.service1}_PARAM_INPUT`);
      var innerCode = generator.blockToCode(parameterBlock, true)[0];

      if(innerCode == undefined)
        innerCode = "";

      // Return code.
      var code = `
        runService("${serviceName}", "${innerCode}").then((res) => { 
      `;
      return code;

    }
    //service 2's code
    javascriptGenerator.forBlock[`${relationship.service2}_${relationship.name}_service_block_order_2`]  = function(block, generator) {
      // Collect argument strings.
      const serviceName = block.getFieldValue('SERVICE_NAME');
      const parameterBlock = block.getInputTargetBlock(`${relationship.service2}_PARAM_INPUT`);
      var innerCode = generator.blockToCode(parameterBlock, true)[0];

      if(innerCode == undefined)
        innerCode = "";
      // Return code.

      return `runService("${serviceName}", "${innerCode}");`;

    }

    //relationship block's code
    javascriptGenerator.forBlock[`${relationship.name}_orderBased`] = function(block, generator) {

      //get the statements attached to this block (ordered top to bottom)
      const children = block.getChildren(true);
      var innerCode = "";
      //get the code from the children
      for(let i = 0; i < children.length; i++)
      {
        innerCode += generator.blockToCode(children[i], true);
      }
      innerCode+= '})';
      return innerCode;

    }
  }

  function createConditionalCode(relationship)
  {
    
    //service 1's code
    javascriptGenerator.forBlock[`${relationship.service1}_${relationship.name}_service_block_conditional_1`]  = function(block, generator) {
      // Collect argument strings.
      const serviceName = block.getFieldValue('SERVICE_NAME');
      const parameterBlock = block.getInputTargetBlock(`${relationship.service1}_PARAM_INPUT`);
      var innerCode = generator.blockToCode(parameterBlock, true)[0];

      if(innerCode === undefined)
        innerCode = "";

      var code = `
        var result = null;
        runService("${serviceName}", "${innerCode}").then((response) => { result = response.data["Service Result"];
      `;
      // Return code.
      return [code, Order.NONE];
    }

    //service 2's code
    javascriptGenerator.forBlock[`${relationship.service2}_${relationship.name}_service_block_conditional_2`]  = function(block, generator) {
      // Collect argument strings.
      const serviceName = block.getFieldValue('SERVICE_NAME');
      const parameterBlock = block.getInputTargetBlock(`${relationship.service2}_PARAM_INPUT`);
      var innerCode = generator.blockToCode(parameterBlock, true)[0];

      if(innerCode === undefined)
        innerCode = "";

      // Return code.
      return `runService("${serviceName}", "${innerCode}");`;
    }

    //relationship block's code
    javascriptGenerator.forBlock[`${relationship.name}_conditional`] = function(block, generator) {

      //get the statements attached to this block (ordered top to bottom)
      const children = block.getChildren(true);
      var innerCode = "";
      var valueToCheck = block.getFieldValue('CONDITION_RESULT_CHECK');

      //get the first child's code (value input)
      innerCode += `async function getData() {`
      innerCode += generator.blockToCode(children[0], true)[0]; //const result = await runService("${serviceName}", "${innerCode}");
      innerCode += `if(parseInt(result) == parseInt(${valueToCheck})) {`; //if(parseInt(result) === parseInt(CONDITION_RESULT_CHECK)) {
      innerCode += generator.blockToCode(children[1], true); //runService(service2)
      innerCode += `}`; //closing If statement
      innerCode += `});}`; //closing getData

      innerCode += `getData();` //run async
      
      return innerCode;

    }

  }

  const handleSaveApp = () => {
    const fileName = prompt("Enter a file name (including .iot extension):");
    if (fileName !== null && fileName !== "" && fileName.trim().endsWith('.iot')) {
      const xml = Blockly.Xml.workspaceToDom(Blockly.getMainWorkspace());
      const xmlText = Blockly.Xml.domToText(xml);
      const blob = new Blob([xmlText], { type: 'text/xml' });
      saveAs(blob, fileName);
      setAppSaved(true);
      console.log('Saved file content:', xmlText);
    } else if (fileName) {
      alert("The file name must end with '.iot'");
  }
  };

  const handleFileUpload = (fileContent) => {
    // Parse the file content and set it to the Blockly workspace
    console.log('Uploaded file content:', fileContent);
    // Check if the textToDom function exists in the Xml namespace
    try{
      let xmlDom = Blockly.utils.xml.textToDom(fileContent);
      Blockly.getMainWorkspace().clear();
      Blockly.Xml.domToWorkspace(xmlDom, Blockly.getMainWorkspace());
      // Force Blockly to update the toolbox and redraw the workspace
      // Blockly.getMainWorkspace().updateToolbox(toolboxXml);
      setShowManager(false);
    } catch (e) {
      console.error("invalid xml");
    }
  };

  const handleFileUploadFromComputer = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const fileContent = event.target.result;
        // You can process the file content here
        console.log('Uploaded file content:', fileContent);
        try{
          let xmlDom = Blockly.utils.xml.textToDom(fileContent);
          Blockly.getMainWorkspace().clear();
          Blockly.Xml.domToWorkspace(xmlDom, Blockly.getMainWorkspace());
          // Force Blockly to update the toolbox and redraw the workspace
          setShowModal(false);
        } catch (e) {
          console.error("invalid xml");
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", marginLeft: "10px", marginRight: "10px" }}>
      {/* Welcome Modal */}
      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        backdrop="static"
        keyboard={false}
      >
        <Modal.Header>
          <Modal.Title>Welcome to the Apps Editor</Modal.Title>
        </Modal.Header>
        <Modal.Footer>
        <Button variant="primary" onClick={() => setShowModal(false)}>
            Start New App
          </Button>
          <input style={{ display: 'none' }} type="file" id="fileInputFromComputer" onChange={handleFileUploadFromComputer} />
          <label htmlFor="fileInputFromComputer" style={{ marginLeft: "10px", marginTop: "10px", cursor: 'pointer', padding: '6px 12px', backgroundColor: 'lightgray', color: 'black', borderRadius: '4px', border: '1px solid black' }}>
            Choose File from This Computer
          </label>
        </Modal.Footer>
      </Modal>

      <AppManager apps={apps} setApps={setApps} workspace={blocklyWorkspace} services={currentServices} show={showManager} onClose={() => setShowManager(false)} onFileUpload={handleFileUpload}/>

      {/* Blockly */}
      <div ref={workspaceRef} style={{ height: '84vh', width: '98vw' }} />
      <div>
        {/* Save app */}
        <Button onClick={handleSaveApp} disabled={appSaved}>
          Download App to This Computer
        </Button>
        {/* Input file */}
        <input style={{ display: 'none' }} type="file" id="fileInputFromComputer" onChange={handleFileUploadFromComputer} />
          <label htmlFor="fileInputFromComputer" style={{ marginLeft: "10px", marginTop: "10px", cursor: 'pointer', padding: '6px 12px', backgroundColor: 'lightgray', color: 'black', borderRadius: '4px', border: '1px solid black' }}>
            Choose File from This Computer
        </label>
        {/* App Manager */}
        <Button variant="secondary" onClick={() => setShowManager(true)} style={{float:'right', marginTop: "10px"}}>App Manager</Button>
      </div>
    </div>
  );
}

export default Apps;
