"""Stop only the exact recorded piano staging container."""
import runpy
runpy.run_path('/tmp/wvh-castle-piano-ops.py')['stop']()
