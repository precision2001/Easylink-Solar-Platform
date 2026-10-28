#!/bin/bash
# Keep the site serving during a deploy: nothing is stopped here. The new
# build is made in a separate folder by start.sh and swapped in at the end,
# so visitors only see the restart (a few seconds), not the whole build.
exit 0
