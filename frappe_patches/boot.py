# Copyright (c) 2026, midhun.geevar@gmail.com and contributors
# For license information, please see license.txt

import frappe


def boot_session(bootinfo):
	"""Expose Patch Settings to the frontend via frappe.boot.patch_settings"""
	try:
		settings = frappe.get_single("Patch Settings")
		bootinfo.patch_settings = {
			"enable_sidebar_filter_fix": settings.enable_sidebar_filter_fix,
		}
	except Exception:
		# Fallback: enable fix by default if DocType not yet migrated
		bootinfo.patch_settings = {
			"enable_sidebar_filter_fix": 1,
		}
