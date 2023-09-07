sap.ui.define([
	"com/bayer/tender/uilib/objects/BaseService"
], function (BaseService) {
	"use strict";

	var ApprovalService = BaseService.extend("com.bayer.tender.whcapp.service.AccessService", {
		constructor: function (model) {
			BaseService.call(this, model);
		},
		getAccess: function () {
			return this.odata('/getAccess').get();

		}
	});
	return ApprovalService;
});