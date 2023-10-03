sap.ui.define([
    "sap/ui/model/SimpleType",
    "sap/ui/model/ValidateException",
    "sap/ui/core/format/NumberFormat"
], function (SimpleType,ValidateException,NumberFormat) {
    "use strict";

    const oPercentFormat = NumberFormat.getPercentInstance({
        decimals: 1
    });

    return SimpleType.extend("com.bayer.tender.whcapp.model.datatypes.CustomPercentageType", {

        formatValue: function(value) {
            if (!value) return value;
			return oPercentFormat.format(value);
        },

        parseValue: function(oValue) {
            if (!oValue) return oValue;
            var floatNum = parseFloat(oValue.replace(",","."));
            return (floatNum/100);

        },

        validateValue: function(oValue) {
            if(oValue > 1) {
                throw new ValidateException("Not a valid percentage!");
            }
        },

        /**
         * Override
         * see https://sapui5.netweaver.ondemand.com/sdk/#/api/sap.ui.model.SimpleType%23methods/Summary
         * @returns 
         */
        getModelFormat: function(){
            return {
                format: value =>  this.formatValue(value),
                parse: value =>  this.parseValue(value)
            }
        }

    });
});