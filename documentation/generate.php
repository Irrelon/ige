<?
/**
 * Generates a local version of the engine API documentation from the
 * JSDoc comments found in the engine source code.
 */
require('parser.php');
include_once("markdown.php");

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
	// First check for if statements in the template with a regexp
	preg_match_all("/=if\{(.*?)\}\[([\s\S.]*?)\=if\{\g1\}]/", $str, $ifArray);

	//var_dump($ifArray);

	foreach ($ifArray[0] as $matchKey => $matchString) {
		echo $ifArray[1][$matchKey] . ' <BR><BR>';
		if (!$item[$ifArray[1][$matchKey]]) {
			// Remove the if container code
			$str = preg_replace("/=if\{" . $ifArray[1][$matchKey] . "\}\[([\s\S.]*?)\=if\{" . $ifArray[1][$matchKey] . "}]/", '', $str);
		}
	}

	$argumentsHtml = '';
	if ($item['params']) {
		foreach ($item['params'] as $argKey => $argVal) {
			if (substr($argVal['type'], 0, 3) === 'Ige') {
				// The type is an Ige* based class type, so link it!
				$argVal['type'] = '<a href="./' . $argVal['type'] . '.html">' . $argVal['type'] . '</a>';
			}
			
			$argumentsHtml .= '<li>{<span class="argType">' . $argVal['type'] . '</span>}<span class="argName">' . $argVal['name'] . '</span> ' . $argVal['desc'] . '</li>';
			if ($paramsHtml) {
				$paramsHtml .= ', ';
			}
			$paramsHtml .= '{<span class="argType">' . $argVal['type'] . '</span>} <span class="argName">' . $argVal['name'] . '</span>';
		}
		if ($argumentsHtml) {
			$argumentsHtml = '<ul class="argList">' . $argumentsHtml . '</ul>';
		}
	}

	$paramsHtml = '(' . $paramsHtml . ')';
	if ($item["returnData"]) {
		$returnHtml = 'Returns {<span class="argType">' . $item["returnData"]["type"] . '</span>} ' . $item["returnData"]["desc"];
	} else {
		$returnHtml = '';
	}

	$examplesHtml = '';
	if ($item["examples"]) {
		foreach ($item['examples'] as $exampleKey => $exampleContent) {
			if (trim($exampleContent)) {
				// Parse markdown
				$exampleContent = Markdown($exampleContent);

				$examplesHtml .= '
					<div class="methodExample">
						<div class="content">' . $exampleContent . '</div>
					</div>
				';

				if ($examplesHtml) {
					echo "Example--: " . $examplesHtml . '<BR><BR>';
				}
			}
		}

		//$item["examplesHtml"] = $examplesHtml;
	}

	$str = str_replace('={returnType}', $item["returnData"]["type"], $str);
	$str = str_replace('={path}', ENGINE_RELATIVE . $path, $str);
	$str = str_replace('={file}', $file, $str);
	$str = str_replace('={arguments}', $argumentsHtml, $str);
	$str = str_replace('={params}', $paramsHtml, $str);
	$str = str_replace('={returnDesc}', $returnHtml, $str);
	$str = str_replace('={examplesHtml}', $examplesHtml, $str);

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