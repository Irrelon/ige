import { b2Vec2 } from "../common/b2_math.js"
/**
 * A field representing the nearest generator from each point.
 */
export declare class b2VoronoiDiagram {
    m_generatorBuffer: b2VoronoiDiagram_Generator[];
    m_generatorCapacity: number;
    m_generatorCount: number;
    m_countX: number;
    m_countY: number;
    m_diagram: b2VoronoiDiagram_Generator[];
    constructor(generatorCapacity: number);
    /**
   * Add a generator.
   *
   * @param center the position of the generator.
   * @param tag a tag used to identify the generator in callback functions.
   * @param necessary whether to callback for nodes associated with the generator.
   */
    AddGenerator(center: b2Vec2, tag: number, necessary: boolean): void;
    /**
   * Generate the Voronoi diagram. It is rasterized with a given
   * interval in the same range as the necessary generators exist.
   *
   * @param radius the interval of the diagram.
   * @param margin margin for which the range of the diagram is extended.
   */
    Generate(radius: number, margin: number): void;
    /**
   * Enumerate all nodes that contain at least one necessary
   * generator.
   */
    GetNodes(callback: b2VoronoiDiagram_NodeCallback): void;
}
/**
 * Callback used by GetNodes().
 *
 * Receive tags for generators associated with a node.
 */
export type b2VoronoiDiagram_NodeCallback = (a: number, b: number, c: number) => void;
export declare class b2VoronoiDiagram_Generator {
    center: b2Vec2;
    tag: number;
    necessary: boolean;
}
export declare class b2VoronoiDiagram_Task {
    m_x: number;
    m_y: number;
    m_i: number;
    m_generator: b2VoronoiDiagram_Generator;
    constructor(x: number, y: number, i: number, g: b2VoronoiDiagram_Generator);
}
