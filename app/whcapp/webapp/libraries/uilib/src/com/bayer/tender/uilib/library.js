/*!
 * ${copyright}
 */

/**
 * Initialization Code and shared classes of library com.bayer.tender.uilib.
 */
sap.ui.define(["sap/ui/core/library"], // library dependency
	function () {

		"use strict";

		/**
		 * HR Library
		 *
		 * @namespace
		 * @name com.bayer.tender.uilib
		 * @author SAP SE
		 * @version 1.0.0
		 * @public
		 */

		// delegate further initialization of this library to the Core
		sap.ui.getCore().initLibrary({
			name: "com.bayer.tender.uilib",
			version: "1.0.0",
			dependencies: ["sap.ui.core"],
			types: [],
			interfaces: [],
			controls: [
				"com.bayer.tender.uilib.controls.Example"],
			elements: []
		});

		/* eslint-disable */
		return com.bayer.tender.uilib;
		/* eslint-enable */

	}, /* bExport= */ false);