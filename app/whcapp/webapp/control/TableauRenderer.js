sap.ui.define([], function () {
  const TableauRenderer = {
    render: function (rm, control) {
      rm.openStart("div", control);
      rm.openEnd();
      rm.openStart("iframe");
      rm.attr("src", control.getSrc());
      rm.attr("width", control.getWidth());
      rm.attr("height", control.getHeight());
      rm.openEnd();
      rm.close("iframe");
      rm.close("div");
    }
  };
  return TableauRenderer;
});