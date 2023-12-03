# Modules Definition
"state": {
	"initial": Number
}

**initial**: Sets the initial value for the state.
If a previous module has already set an initial value,
the value from the current module will be added to the
existing value. This allows multiple modules that provide
the same states to stack, allowing the player to add more
and more modules to their ship and provide more and more
of the state.  