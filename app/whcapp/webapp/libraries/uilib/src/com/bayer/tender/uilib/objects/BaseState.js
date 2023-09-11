sap.ui.define([
	"sap/ui/base/Object",
	"sap/ui/model/json/JSONModel"
], function (Object, JSONModel) {
	"use strict";
	return Object.extend("com.bayer.tender.uilib.objects.BaseState", {
		constructor: function (data) {
			this.isDirty = false;
			// this.getModel().attachPropertyChange(function (oProperty) { // eslint-disable-line no-console
			// 	if(this.isDirtyCheck){
			// 		this.isDirty = this.isDirtyCheck();
			// 	}
			// 	// this.isDirty = this.isDirtyCheck();
			// 	// sap && sap.ushell && sap.ushell.Container && sap.ushell.Container.setDirtyFlag(this.isDirty);
			// 	// this["update" + oProperty.getParameter("path")] && this["update" + oProperty.getParameter("path").substr(1)]();
			// 	var fChangeFunction = this.getChangeFunction(oProperty.getParameter("path"));
			// 	this.callChangeFunction(fChangeFunction.function, fChangeFunction.caller, [this, oProperty]);
			// 	if (oProperty.getParameter("context")) {
			// 		fChangeFunction = this.getChangeFunction(oProperty.getParameter("context").getPath() + "/" + oProperty.getParameter("path"));
			// 		this.callChangeFunction(fChangeFunction.function, oProperty.getParameter("context").getObject(), oProperty);
			// 		//call parent
			// 		var sPath = oProperty.getParameter("context").getPath();
			// 		var sParent = sPath.split("/")[sPath.split("/").length - 1];
			// 		if (!isNaN(parseInt(sParent))) { //in case of integer it's probably an array and we need to go one level up
			// 			sPath = sPath.split("/").slice(0, sPath.split("/").length - 1).join("/");
			// 		}
			// 		var sSourcePath = sPath.split("/").slice(0, sPath.split("/").length - 1).join("/");
			// 		var oSource = (sSourcePath && oProperty.getParameter("context").getModel().getProperty(sSourcePath));
			// 		fChangeFunction = this.getChangeFunction(sPath);
			// 		this.callChangeFunction(fChangeFunction.function, (oSource || oProperty.getParameter("context").getObject()), oProperty);

			// 	}
			// }, this);
		},
		getProperty: function (property) {
			return this.data[property];
		},
		setProperty: function (property, value) {
			this.data[property] = value;
			this.updateModel();
		},
		getChangeFunction: function (sPath) {
			sPath = sPath.substr(0, 1) === "/" ? sPath.substr(1) : sPath;
			return sPath.split("/").reduce(function (prev,
				curr,
				idx, array) {
				if (idx === array.length - 1) {
					return {
						function: prev[curr + "Changed"],
						caller: prev
					};
				}
				return curr && curr.length > 0 && prev ? prev[curr] : prev;
			}, this.data);
		},
		callChangeFunction: function (fChangeFunction, scope, args) {
			if(fChangeFunction){
				fChangeFunction.apply(scope, args);
			}
		},
		getModel: function () {
			if (!this.model) {
				this.model = new JSONModel(this.data, true);
				//this.model.setData(this);
			}
			return this.model;
		},
		updateModel: function (bHardRefresh) {
			if (this.model) {
				this.model.refresh(bHardRefresh ? true : false);
			}
		},
		create_UUID: function(){
            var dt = new Date().getTime();
            var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = (dt + Math.random()*16)%16 | 0;
                dt = Math.floor(dt/16);
                return (c=='x' ? r :(r&0x3|0x8)).toString(16);
            });
            return uuid;
        }
	});
});