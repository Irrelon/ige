import { b2Body } from "../dynamics/b2_body.js"
import { b2TimeStep } from "../dynamics/b2_time_step.js"
import { b2Draw } from "../common/b2_draw.js"
/**
 * A controller edge is used to connect bodies and controllers
 * together in a bipartite graph.
 */
export declare class b2ControllerEdge {
    readonly controller: b2Controller;
    readonly body: b2Body;
    prevBody: b2ControllerEdge | null;
    nextBody: b2ControllerEdge | null;
    prevController: b2ControllerEdge | null;
    nextController: b2ControllerEdge | null;
    constructor(controller: b2Controller, body: b2Body);
}
/**
 * Base class for controllers. Controllers are a convience for
 * encapsulating common per-step functionality.
 */
export declare abstract class b2Controller {
    m_bodyList: b2ControllerEdge | null;
    m_bodyCount: number;
    m_prev: b2Controller | null;
    m_next: b2Controller | null;
    /**
     * Controllers override this to implement per-step functionality.
     */
    abstract Step(step: b2TimeStep): void;
    /**
     * Controllers override this to provide debug drawing.
     */
    abstract Draw(debugDraw: b2Draw): void;
    /**
     * Get the next controller in the world's body list.
     */
    GetNext(): b2Controller | null;
    /**
     * Get the previous controller in the world's body list.
     */
    GetPrev(): b2Controller | null;
    /**
     * Get the parent world of this body.
     */
    /**
     * Get the attached body list
     */
    GetBodyList(): b2ControllerEdge | null;
    /**
     * Adds a body to the controller list.
     */
    AddBody(body: b2Body): void;
    /**
     * Removes a body from the controller list.
     */
    RemoveBody(body: b2Body): void;
    /**
     * Removes all bodies from the controller list.
     */
    Clear(): void;
}
