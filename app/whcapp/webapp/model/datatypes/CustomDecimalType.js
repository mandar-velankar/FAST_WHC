sap.ui.define([
    "sap/ui/model/SimpleType",
    "sap/ui/model/ValidateException",
    "sap/ui/core/format/NumberFormat"
], function (SimpleType,ValidateException,NumberFormat) {
    "use strict";
    return SimpleType.extend("com.bayer.tender.whcapp.model.datatypes.CustomDecimalType", {

        _oNumberFormat : NumberFormat.getFloatInstance({
            maxFractionDigits: 2,
            groupingEnabled: true,
            groupingSeparator: ",",
            decimalSeparator: "."
        }),

        formatValue: function(oValue) {
            if (oValue) oValue = Number(oValue)?.toFixed(2);
            return this._oNumberFormat.format(oValue);
        },

        parseValue: function(oValue) {
            oValue = oValue.replace(",",".");
            return this._oNumberFormat.format(oValue);
        },

        validateValue: function(oValue) {}

    });
});