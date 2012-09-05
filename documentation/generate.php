<?
/**
 * Generates a local version of the engine API documentation from the
 * JSDoc comments found in the engine source code.
 */
require('parser.php');

/**
 * Recursively processes a path and extracts JSDoc comment data from
 * every .js file it finds.
 * @param $path
 */
function recurse ($path) {
	$fList = scandir($path);

	foreach ($fList as $key => $val) {
		switch ($val) {
			case '.':
			case '..':
				// Ignore these entries
				break;

			default:
				if (is_dir($path . '/' . $val)) {
					// The entry is a folder so recurse it
					recurse($path . '/' . $val);
				} else {
					// The entry is a file, check if it's a .js file
					if (substr($val, strlen($val) - 3, 3) === '.js') {
						// Process the JS file
						echo 'Processing JavaScript file: ' . $path . '/' . $val . '<BR>';
						$data = parseFile($path . '/' . $val);

						processData($data, $path . '/' . $val, $val);
					}
				}
				break;
		}
	}
}

function parseTemplate($str, $item, $path, $file) {
	$argumentsHtml = '';
	if ($item['params']) {
		foreach ($item['params'] as $argKey => $argVal) {
			$argumentsHtml .= '<li>{<span class="argType">' . $argVal['type'] . '</span>}<span class="argName">' . $argVal['name'] . '</span> ' . $argVal['desc'] . '</li>';
		}
		if ($argumentsHtml) {
			$argumentsHtml = '<ul class="argList">' . $argumentsHtml . '</ul>';
		}
	}

	$str = str_replace('={path}', ENGINE_RELATIVE . $path, $str);
	$str = str_replace('={file}', $file, $str);
	$str = str_replace('={arguments}', $argumentsHtml, $str);

	preg_match_all("/={(.*?)}/", $str, $matches);

	foreach ($matches[1] as $key => $value) {
		$str = str_replace('={' . $value . '}', $item[$value], $str);
	}

	return $str;
}

function processData ($data, $path, $file) {
	// Check if the file contained a class definition
	if ($data[0]['type'] === 'class') {
		$outFile = OUT_FOLDER . '/' . $data[0]['name'] . '.html';

		foreach ($data as $key => $item) {
			//var_dump($item);
			switch ($item['type']) {
				case 'class':
					// Write the class header details
					file_put_contents($outFile, parseTemplate(file_get_contents(TEMPLATES_FOLDER . '/classHeader.html'), $item, $path, $file));
					file_put_contents($outFile, parseTemplate(file_get_contents(TEMPLATES_FOLDER . '/classBody.html'), $item, $path, $file), FILE_APPEND);
					break;

				case 'function':
					file_put_contents($outFile, parseTemplate(file_get_contents(TEMPLATES_FOLDER . '/functionBody.html'), $item, $path, $file), FILE_APPEND);
					break;
			}
		}

		file_put_contents($outFile, parseTemplate(file_get_contents(TEMPLATES_FOLDER . '/classFooter.html'), $item, $path, $file), FILE_APPEND);
	} else {
		$outFile = OUT_FOLDER . '/globals.html';
	}
}

// Define the folder to output to
define('OUT_FOLDER', './root');
define('TEMPLATES_FOLDER', './templates');
define('ENGINE_RELATIVE', '../');

// Create the out folder
@mkdir(OUT_FOLDER);

recurse('../engine');
?>