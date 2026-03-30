import bpy


GROUP_NAME = "Flipbook UV"


def clear_node_tree(node_tree):
    while node_tree.nodes:
        node_tree.nodes.remove(node_tree.nodes[0])


def new_interface_socket(node_tree, name, in_out, socket_type, default=None, min_value=None):
    if hasattr(node_tree, "interface"):
        socket = node_tree.interface.new_socket(name=name, in_out=in_out, socket_type=socket_type)
    else:
        sockets = node_tree.inputs if in_out == "INPUT" else node_tree.outputs
        socket = sockets.new(socket_type, name)

    if default is not None and hasattr(socket, "default_value"):
        socket.default_value = default

    if min_value is not None and hasattr(socket, "min_value"):
        socket.min_value = min_value

    return socket


def configure_interface(node_tree):
    if hasattr(node_tree, "interface"):
        while node_tree.interface.items_tree:
            node_tree.interface.remove(node_tree.interface.items_tree[0])
    else:
        node_tree.inputs.clear()
        node_tree.outputs.clear()

    new_interface_socket(node_tree, "UV", "INPUT", "NodeSocketVector")
    new_interface_socket(node_tree, "Columns", "INPUT", "NodeSocketFloat", default=8.0, min_value=1.0)
    new_interface_socket(node_tree, "Rows", "INPUT", "NodeSocketFloat", default=8.0, min_value=1.0)
    new_interface_socket(node_tree, "Playback FPS", "INPUT", "NodeSocketFloat", default=12.0, min_value=0.001)
    new_interface_socket(node_tree, "Scene FPS", "INPUT", "NodeSocketFloat", default=24.0, min_value=0.001)
    new_interface_socket(node_tree, "Frame", "INPUT", "NodeSocketFloat", default=1.0)
    new_interface_socket(node_tree, "Flip Y", "INPUT", "NodeSocketFloat", default=1.0, min_value=0.0)

    new_interface_socket(node_tree, "UVS", "OUTPUT", "NodeSocketVector")
    new_interface_socket(node_tree, "Frame Index", "OUTPUT", "NodeSocketFloat")
    new_interface_socket(node_tree, "Column", "OUTPUT", "NodeSocketFloat")
    new_interface_socket(node_tree, "Row", "OUTPUT", "NodeSocketFloat")


def add_math(nodes, operation, label, location):
    node = nodes.new("ShaderNodeMath")
    node.operation = operation
    node.label = label
    node.location = location
    node.use_clamp = False
    return node


def add_vector_math(nodes, operation, label, location):
    node = nodes.new("ShaderNodeVectorMath")
    node.operation = operation
    node.label = label
    node.location = location
    return node


def add_value(nodes, value, label, location):
    node = nodes.new("ShaderNodeValue")
    node.label = label
    node.location = location
    node.outputs[0].default_value = value
    return node


def add_combine_xyz(nodes, label, location):
    node = nodes.new("ShaderNodeCombineXYZ")
    node.label = label
    node.location = location
    return node


def create_flipbook_group(group_name=GROUP_NAME):
    node_tree = bpy.data.node_groups.get(group_name)
    if node_tree is None:
        node_tree = bpy.data.node_groups.new(group_name, "ShaderNodeTree")

    configure_interface(node_tree)
    clear_node_tree(node_tree)

    nodes = node_tree.nodes
    links = node_tree.links

    group_input = nodes.new("NodeGroupInput")
    group_input.location = (-1400, 0)

    group_output = nodes.new("NodeGroupOutput")
    group_output.location = (900, 0)

    one = add_value(nodes, 1.0, "One", (-1150, -650))

    total_frames = add_math(nodes, "MULTIPLY", "Total Frames", (-1150, 250))
    frame_times_playback = add_math(nodes, "MULTIPLY", "Frame * Playback FPS", (-1150, 50))
    divide_scene_fps = add_math(nodes, "DIVIDE", "Seconds To Playback Frames", (-900, 50))
    frame_index = add_math(nodes, "FLOOR", "Frame Index", (-650, 50))
    frame_loop = add_math(nodes, "MODULO", "Looped Frame", (-400, 50))

    column = add_math(nodes, "MODULO", "Column", (-150, 200))
    row_divide = add_math(nodes, "DIVIDE", "Row Raw", (-150, -20))
    row = add_math(nodes, "FLOOR", "Row", (100, -20))

    column_norm = add_math(nodes, "DIVIDE", "Column Offset", (100, 220))
    row_norm = add_math(nodes, "DIVIDE", "Row Offset", (100, -180))
    row_plus_one = add_math(nodes, "ADD", "Row + 1", (100, -340))
    row_plus_one_div_rows = add_math(nodes, "DIVIDE", "(Row + 1) / Rows", (350, -340))
    flipped_row_norm = add_math(nodes, "SUBTRACT", "Flipped Row Offset", (600, -340))

    one_minus_flip_y = add_math(nodes, "SUBTRACT", "1 - Flip Y", (350, -520))
    row_part_unflipped = add_math(nodes, "MULTIPLY", "Unflipped Row Part", (600, -150))
    row_part_flipped = add_math(nodes, "MULTIPLY", "Flipped Row Part", (600, -500))
    final_row_offset = add_math(nodes, "ADD", "Final Row Offset", (850, -320))

    grid_vector = add_combine_xyz(nodes, "Grid Vector", (-150, 500))
    uv_scaled = add_vector_math(nodes, "DIVIDE", "UV / Grid", (100, 500))
    offset_vector = add_combine_xyz(nodes, "Offset Vector", (850, 180))
    uv_final = add_vector_math(nodes, "ADD", "Final UV", (1100, 350))

    links.new(group_input.outputs["Columns"], total_frames.inputs[0])
    links.new(group_input.outputs["Rows"], total_frames.inputs[1])

    links.new(group_input.outputs["Frame"], frame_times_playback.inputs[0])
    links.new(group_input.outputs["Playback FPS"], frame_times_playback.inputs[1])

    links.new(frame_times_playback.outputs[0], divide_scene_fps.inputs[0])
    links.new(group_input.outputs["Scene FPS"], divide_scene_fps.inputs[1])

    links.new(divide_scene_fps.outputs[0], frame_index.inputs[0])

    links.new(frame_index.outputs[0], frame_loop.inputs[0])
    links.new(total_frames.outputs[0], frame_loop.inputs[1])

    links.new(frame_loop.outputs[0], column.inputs[0])
    links.new(group_input.outputs["Columns"], column.inputs[1])

    links.new(frame_loop.outputs[0], row_divide.inputs[0])
    links.new(group_input.outputs["Columns"], row_divide.inputs[1])

    links.new(row_divide.outputs[0], row.inputs[0])

    links.new(column.outputs[0], column_norm.inputs[0])
    links.new(group_input.outputs["Columns"], column_norm.inputs[1])

    links.new(row.outputs[0], row_norm.inputs[0])
    links.new(group_input.outputs["Rows"], row_norm.inputs[1])

    links.new(row.outputs[0], row_plus_one.inputs[0])
    links.new(one.outputs[0], row_plus_one.inputs[1])

    links.new(row_plus_one.outputs[0], row_plus_one_div_rows.inputs[0])
    links.new(group_input.outputs["Rows"], row_plus_one_div_rows.inputs[1])

    links.new(one.outputs[0], flipped_row_norm.inputs[0])
    links.new(row_plus_one_div_rows.outputs[0], flipped_row_norm.inputs[1])

    links.new(one.outputs[0], one_minus_flip_y.inputs[0])
    links.new(group_input.outputs["Flip Y"], one_minus_flip_y.inputs[1])

    links.new(row_norm.outputs[0], row_part_unflipped.inputs[0])
    links.new(one_minus_flip_y.outputs[0], row_part_unflipped.inputs[1])

    links.new(flipped_row_norm.outputs[0], row_part_flipped.inputs[0])
    links.new(group_input.outputs["Flip Y"], row_part_flipped.inputs[1])

    links.new(row_part_unflipped.outputs[0], final_row_offset.inputs[0])
    links.new(row_part_flipped.outputs[0], final_row_offset.inputs[1])

    links.new(group_input.outputs["Columns"], grid_vector.inputs["X"])
    links.new(group_input.outputs["Rows"], grid_vector.inputs["Y"])

    links.new(group_input.outputs["UV"], uv_scaled.inputs[0])
    links.new(grid_vector.outputs[0], uv_scaled.inputs[1])

    links.new(column_norm.outputs[0], offset_vector.inputs["X"])
    links.new(final_row_offset.outputs[0], offset_vector.inputs["Y"])

    links.new(uv_scaled.outputs[0], uv_final.inputs[0])
    links.new(offset_vector.outputs[0], uv_final.inputs[1])

    links.new(uv_final.outputs[0], group_output.inputs["UVS"])
    links.new(frame_loop.outputs[0], group_output.inputs["Frame Index"])
    links.new(column.outputs[0], group_output.inputs["Column"])
    links.new(row.outputs[0], group_output.inputs["Row"])

    return node_tree


def add_group_to_active_material(group_name=GROUP_NAME):
    material = bpy.context.object.active_material if bpy.context.object else None
    if material is None or not material.use_nodes:
        return None

    node_tree = create_flipbook_group(group_name)
    nodes = material.node_tree.nodes
    node = nodes.new("ShaderNodeGroup")
    node.node_tree = node_tree
    node.location = (0, 0)
    return node


if __name__ == "__main__":
    group = create_flipbook_group()
    print(f"Created node group: {group.name}")
