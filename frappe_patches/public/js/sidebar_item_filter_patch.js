/**
 * Patch: Fix sidebar item filter applying operator value in route_options
 *
 * BUG:
 *   In frappe/public/js/frappe/ui/sidebar/sidebar_item.js (~line 59-66),
 *   when building route_options from sidebar item filters, the code calls:
 *
 *     let filters_json = JSON.parse(
 *       frappe.utils.get_filter_as_json(JSON.parse(this.item.filters))
 *     );
 *
 *   `get_filter_as_json` returns an object like:
 *     { "workflow_state": ["=", "Awaiting MD Approval"] }
 *
 *   This is then passed as `args.route_options`, and later in `generate_route`,
 *   the route_options are URL-encoded by iterating over the values directly,
 *   which results in the array ["=", "Awaiting MD Approval"] being serialized as
 *   "=,Awaiting MD Approval" — producing a URL like:
 *
 *     /desk/workflow-action/view/list?workflow_state==,Awaiting%20MD%20Approval
 *
 * FIX:
 *   When building route_options for the list view, each filter value should be
 *   extracted as just the plain value (index [3] of the [doctype, fieldname, operator, value] tuple).
 *   This is consistent with how workspace shortcut filters work correctly.
 *
 * TOGGLE:
 *   This fix can be enabled/disabled via Frappe Patches > Patch Settings.
 *   The setting is exposed at frappe.boot.patch_settings.enable_sidebar_filter_fix
 *   Disable it to verify whether the official Frappe release has resolved the issue.
 */

frappe.ready(function () {
	const patch_settings = frappe.boot && frappe.boot.patch_settings;
	const is_enabled = patch_settings && patch_settings.enable_sidebar_filter_fix;

	if (!is_enabled) {
		// Patch is disabled via Patch Settings — use stock Frappe behaviour
		console.log("[frappe_patches] Sidebar filter fix is DISABLED via Patch Settings.");
		return;
	}

	console.log("[frappe_patches] Sidebar filter fix is ACTIVE.");

	// Store ref to original class before overriding
	const OriginalTypeLink = frappe.ui.sidebar_item.TypeLink;

	frappe.ui.sidebar_item.TypeLink = class SidebarItemFilterPatched extends OriginalTypeLink {
		get_path() {
			let path;

			if (this.item.type === "Link") {
				if (this.item.link_type === "Report") {
					let args = {
						type: this.item.link_type,
						name: this.item.link_to,
					};
					if (!frappe.app.sidebar.editor.edit_mode) {
						if (this.item.report) {
							args.is_query_report =
								this.item.report.report_type === "Query Report" ||
								this.item.report.report_type == "Script Report";
							args.report_ref_doctype = this.item.report.ref_doctype;
						} else {
							return;
						}
					}
					path = frappe.utils.generate_route(args);

				} else if (this.item.link_type == "Workspace") {
					let workspaces = frappe.workspaces[frappe.router.slug(this.item.link_to)];
					if (workspaces.public) {
						path = "/desk/" + frappe.router.slug(this.item.link_to);
					} else {
						path = "/desk/private/" + frappe.router.slug(this.item.link_to);
					}
					if (this.item.route) {
						path = this.item.route;
					}

				} else if (this.item.link_type === "URL") {
					path = this.item.url;

				} else if (this.item.link_type == "Page" && this.item.route_options) {
					path = frappe.utils.generate_route({
						type: this.item.link_type,
						name: this.item.link_to,
						route_options: JSON.parse(this.item.route_options),
					});

				} else {
					let args = {
						type: this.item.link_type,
						name: this.item.link_to,
						tab: this.item.tab,
					};

					if (this.item.filters) {
						// Each filter is [doctype, fieldname, operator, value, ...]
						let raw_filters = JSON.parse(this.item.filters);

						if (this.item.link_type == "DocType" && raw_filters && raw_filters.length) {
							args.doc_view = "List";

							// ✅ FIX: Build route_options as { fieldname: value }
							// using only index [3] (the plain value) — NOT the
							// ["=", "value"] array that get_filter_as_json() returns.
							//
							// Without this fix, the operator "=" gets joined with the
							// value via Array.toString(), producing "=,Awaiting MD Approval"
							// in the URL instead of just "Awaiting MD Approval".
							let route_options = {};
							raw_filters.forEach((filter) => {
								// filter = [doctype, fieldname, operator, value, hidden?]
								if (Array.isArray(filter) && filter.length >= 4) {
									route_options[filter[1]] = filter[3];
								}
							});
							args.route_options = route_options;
						}
					}
					path = frappe.utils.generate_route(args);
				}
			}

			return path;
		}
	};
});
