#!/usr/bin/env python3
"""
Trim the walk clip of already-imported characters to one steady loop, in
place (see import_model.loop_clip; new imports do this themselves).

    python3 -I tools/loop_walk.py assets/models/workerCarrier.glb ...
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from import_model import Model, loop_clip, remove_unused  # noqa: E402

for path in sys.argv[1:]:
    model = Model(path)
    span = loop_clip(model, "walk")
    if not span:
        print(f"{path}: no walk clip to trim")
        continue
    remove_unused(model)
    model.write(path)
    print(f"{path}: walk kept {span[0]:.2f}-{span[1]:.2f} s ({os.path.getsize(path)} bytes)")
