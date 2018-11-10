var uiLang = chrome.i18n.getUILanguage();

function checkPositionCookie() {
	return new Promise(function(resolve, reject) {
		var acceptable_positions = ["unset", "fixed", "sticky", "absolute", "relative", "inherit", "initial", "static"];
		var result = "unset";
		if (chrome && chrome.cookies)
		{
			chrome.cookies.getAll({domain: 'thank-you-page.com'}, function(cookies){
				for (var cookiesIter = 0; cookiesIter < cookies.length; cookiesIter++)
				{
					if (cookies[cookiesIter]["name"] === "of_tyh_pos") 
					{
						result = cookies[cookiesIter]["value"];
						break;
					}
				}
				result = acceptable_positions.indexOf(result) !== -1 ? result : "unset";
				resolve(result);
			});
		}
		else
		{
			resolve(result);
		}
	});
}
