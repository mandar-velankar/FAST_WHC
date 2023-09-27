sap.ui.define([
    "sap/ui/model/SimpleType",
    "sap/ui/model/ValidateException"
], function (SimpleType,ValidateException) {
    "use strict";
    return SimpleType.extend("com.bayer.tender.whcapp.model.datatypes.CustomNumberType", {

        formatValue: function(number) {
            return number;
        },

        parseValue: function(number) {
            return number;
        },

        validateValue: function(number) {

            if(!(/^\+?[0-9]\d*$/.test(number))) {
                throw new ValidateException("Not a valid number");
            }
        }

    });
});