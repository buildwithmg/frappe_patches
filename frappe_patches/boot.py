import frappe


def boot_session(bootinfo):
	try:
		settings = frappe.get_single("Patch Settings")
		bootinfo.patch_settings = {
			"enable_sidebar_filter_fix": settings.enable_sidebar_filter_fix,
		}
	except Exception:
		bootinfo.patch_settings = {
			"enable_sidebar_filter_fix": 1,
		}
