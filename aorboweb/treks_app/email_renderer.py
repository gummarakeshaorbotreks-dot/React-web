"""
Utility to render React email components via Node.js.
Calls the renderEmail.mjs script in aorbo-frontend/scripts/ 
to produce an HTML string for sending emails.
"""

import json
import logging
import os
import subprocess
import tempfile

from django.conf import settings

logger = logging.getLogger(__name__)

# Path to the render script relative to the Django project root.
# Assumes aorbo-frontend is a sibling directory.
_BASE_DIR = getattr(settings, 'BASE_DIR', None)
if _BASE_DIR:
    _FRONTEND_DIR = os.path.join(os.path.dirname(_BASE_DIR), 'aorbo-frontend')
else:
    _FRONTEND_DIR = os.path.join(os.getcwd(), '..', 'aorbo-frontend')

_RENDER_SCRIPT = os.path.join(_FRONTEND_DIR, 'scripts', 'renderEmail.mjs')


def render_react_email(component_name: str, props: dict) -> str:
    """
    Render a React email component (from aorbo-frontend/src/emails/) 
    to a complete HTML string suitable for email sending.

    Args:
        component_name: e.g. "TrekkerEmail", "OrganizerEmail", etc.
        props: Dictionary of props to pass to the component.

    Returns:
        HTML string (with <!DOCTYPE html> wrapper).
    """
    if not os.path.exists(_RENDER_SCRIPT):
        logger.error(f"Render script not found: {_RENDER_SCRIPT}")
        raise FileNotFoundError(
            f"renderEmail.mjs not found at {_RENDER_SCRIPT}. "
            "Ensure aorbo-frontend/scripts/ exists and has been installed."
        )

    props_json = json.dumps(props, default=str)

    try:
        result = subprocess.run(
            ['node', '--experimental-vm-modules', _RENDER_SCRIPT, component_name, props_json],
            capture_output=True,
            text=True,
            timeout=30,
            cwd=_FRONTEND_DIR,
        )
    except subprocess.TimeoutExpired:
        logger.error(f"Timeout rendering email component: {component_name}")
        raise
    except FileNotFoundError:
        logger.error("Node.js not found. Cannot render React email.")
        raise

    if result.returncode != 0:
        stderr = result.stderr.strip()
        logger.error(f"Email render failed for {component_name}: {stderr}")
        raise RuntimeError(
            f"React email render failed for {component_name}: {stderr}"
        )

    html = result.stdout.strip()
    if not html:
        logger.error(f"Email render returned empty output for {component_name}")
        raise RuntimeError(f"Empty render output for {component_name}")

    return html

