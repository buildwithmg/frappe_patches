/**
 * Patch: Fix sidebar item filter applying operator value in route_options
 */

frappe.ready(function () {
	const patch_settings = frappe.boot && frappe.boot.patch_settings;
	const is_enabled = patch_settings && patch_settings.enable_sidebar_filter_fix;

	if (!is_enabled) {
		return;
	}

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
						let raw_filters = JSON.parse(this.item.filters);

						if (this.item.link_type == "DocType" && raw_filters && raw_filters.length) {
							args.doc_view = "List";

							let route_options = {};
							raw_filters.forEach((filter) => {
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
