"""Stop only the recorded, owned rounds preflight container."""
import runpy
runpy.run_path('/tmp/wvh-castle-rounds-ops.py')['stop']()
