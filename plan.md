Plan:
1. Fix core variables logic (Return false to avoid segfault).
2. Implement HW Render FBO (Instead of returning 0, we create a 2048x2048 FBO with depth/stencil depending on what the core requested, and render that FBO to the screen using our shader).
