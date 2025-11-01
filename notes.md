# Notes

Fix isometric tile rendering from IgeCellSheet instances.

When using IgeUiElement's that are stacked on each other (mounted),
pointer events like pointerUp appear to bubble from the bottom up
instead of top-down so elements deeper in the scene graph don't
get their events. You have to switch pointerEventsActive(false)
on the container element to get the child elements to work.
This might be what we want to do but I need to think about it more
and also have a VERY clear documentation if this is the way we
should be doing things.