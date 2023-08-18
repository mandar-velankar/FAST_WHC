sap.ui.define(["sap/ui/core/Control", "./TableauRenderer"], function (Control, TableauRenderer) {
  
  const Tableau = Control.extend("com.bayer.tender.whcapp.control.Tableau", {
    renderer: TableauRenderer,
    metadata: {
      properties: {
        "src": "string",
        "width": "string",
        "height": "string"
      }
    }
  });
  ;
  return Tableau;
});