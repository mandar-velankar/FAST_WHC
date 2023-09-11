sap.ui.define([
	"sap/ui/base/Object",
	"sap/ui/model/json/JSONModel",
	"sap/base/strings/capitalize"
], function (Object, JSONModel, capitalize) {
	"use strict";
	return Object.extend("com.bayer.tender.uilib.objects.BaseObject", {
		constructor: function (data) {
			this.busy = false;
			this.copyValues(data);
		},
		setBusy: function (busy) {
			this.busy = busy;
		},
		getBusy: function () {
			return this.busy;
		},
		getJSONObject: function (aFields) {
			return this.copyFields({
				from: this,
				to: {},
				fields: aFields,
				formatter: capitalize,
				toString: true
			});
		},
		copyFieldsToObject: function (aFields) {
			return this.copyFields({
				from: this,
				to: {},
				fields: aFields
			});
		},
		copyFieldsToThis: function (oFrom, aFields) {
			return this.copyFields({
				from: oFrom,
				to: this,
				fields: aFields
			});
		},
		copyFields: function (properties) {
			var from = properties.from,
				to = properties.to,
				fields = properties.fields,
				formatter = properties.formatter,
				toString = properties.toString || false;
			for (var prop in from) {
				if (fields.find(function (field) {
						return field === prop;
					})) {
					var newPropName = formatter(prop) || prop;
					to[newPropName] = toString && !(from[prop] instanceof Date) && (typeof from[prop] !== "boolean") ? from[prop].toString() : from[prop] instanceof Date?new Date(from[prop]):from[prop];//eslint-disable-line
				}
			}
			return to;
		},
		initDirtyCheck: function () {
			this.isDirty = false;
			this.enableDirtyFlag();
			this.updateModel();
		},
		disableDirtyFlag: function () {
			this.setDirtyFlag(false);
		},
		enableDirtyFlag: function () {
			this.setDirtyFlag(this.isDirty);
		},
		setDirtyFlag: function (bIsDirty) {
			if(sap && sap.ushell && sap.ushell.Container){
				sap.ushell.Container.setDirtyFlag(bIsDirty);	
			} 
		},
		copyValues: function (data) {
			if (data) {
				for (var field in data) {
					switch (typeof (data[field])) {
					case "object":
						if (data[field] instanceof Date) {
							this[this.camelize(field)] = data[field];
						}
						if (data[field] && data[field]["results"]) {
							this[field] = data[field]["results"];
						}
						break;
					default:
						this[this.camelize(field)] = data[field];
					}
				}
			}
		},
		camelize: function (str) {
			return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
				return index == 0 ? word.toLowerCase() : word.toUpperCase();
			}).replace(/\s+/g, '');
		},
		getData: function () {
			var req = jQuery.extend({}, this);
			delete req["model"];
			return req;
		},
		fnMap: function (oObject) {
			var obj = {};
			for (var prop in oObject) {
				// eslint-disable-next-line
				if (oObject.hasOwnProperty(prop) && typeof (oObject[prop]) !== "object") {
					obj[prop] = oObject[prop];
				}
			}
			return obj;
		}
	});
});