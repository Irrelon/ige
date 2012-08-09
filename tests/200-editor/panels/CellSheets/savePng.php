<?
	// Receives a request with a data URL, decodes it
	// and sends it back to the browser as an image
	header("Content-Disposition: attachment; filename=" . strtolower(str_replace(' ', '_', $_POST['imageName'])));
	header("Content-type: image/png");
	
	// Remove the leading data header
	$fileData = file_get_contents($_POST['imageData']);

	// Save the file to the texture repo folder
	file_put_contents('../../' . $_POST['projectPath'] . '/assets/textures/' . $_POST['imageName'], $fileData);
?>