# Teacher Room Access

The school role endpoint originally classified only active primary role 3
(teacher) as eligible for the staff room. Active role 1 (administrator) was
incorrectly excluded. The reviewed patch adds role 1 to that access tag, without
editing user accounts, database records, other map permissions or login settings.
Roles 2, 4, unknown roles, parents/students without a staff account, and inactive
accounts do not gain staff-room access.

The production endpoint is separate from the public map repository. No live PHP
configuration, passwords or account email addresses are stored here. The patch
preserves its existing credentials, token validation and parent/student queries.

Deployment: transfer the patch to `/tmp/wvh-teacher-access-20261107.patch`, then
run `deploy.py` as root on the VPS. It requires the exact old query, applies the
patch to a private staging copy, checks PHP syntax and seven read-only MySQL
fixtures, saves a private rollback copy and atomically replaces the live file.
No WorkAdventure restart is needed. A separate authenticated lookup and map API
check must confirm the affected school account before closing the incident.
