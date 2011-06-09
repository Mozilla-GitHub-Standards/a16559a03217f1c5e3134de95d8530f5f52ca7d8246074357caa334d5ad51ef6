BaseClasses = require("study_base_classes.js");

// -------------------------------- META DATA --------------------------------
exports.experimentInfo = {

  testName: "New Tab Study",
  testId: 201106061747,	//  unique
  testInfoUrl: "https://",	// URL of page explaining your study
  summary: "Detect what the users do after open a new blank tab",
  thumbnail: "http://", // URL of image representing your study (90x90)
  
  versionNumber: 1, 
  duration: 5, 			// days
  minTPVersion: "1.0a1",
  minFXVersion: "4.0", 
  
  recursAutomatically: false,
  recurrenceInterval: 60, // days

  startDate: null, 
  optInRequired: false 
};

// --------------- variables

const EVENTS = {
	START: 0,
	LOAD_PAGE: 1,
	LEAVE: 2
}

const METHODS = {
	UNKNOWN:		999,
	//------------------
	COMMAND_T: 		000,	
	PLUS_BTN: 		001,	
	DOUBLE_CLICK: 	002,	
	FILE_MENU: 		003,
	//--------------------
	BAR_ENTER: 		100,	
	BAR_GO_BTN: 	101,	
	BAR_DROP_CLICK:	102,
	BAR_DROP_ENTER:	103,
	BAR_DROP_BUTTON: 104,
	
	SEARCH_ENTER:	110,	
	SEARCH_GO_BTN:	111,
	SEARCH_DROP_ENTER: 112,
	SEARCH_DROP_CLICK: 113,
	
	TOP_SITES:		120,	
	BOOKMARK_BAR:	121,
	BOOKMARK_MENU:	122,
	
	HISTORY_MENU:	130,
	
	BAR_DROP: 		199,
	//--------------------
	LEAVE: 			200,		
	CLOSE: 			201
}

const LOADPAGE_METHOD_NAMES = {
	10: "UrlBar",
	11: "SearchBar",
	12: "Bookmarks",	
	13: "History"
}

// ----------------- database schema

// CODE
//tab_id: 
//		same as the timestamp when the tab was first created
// event:
//		0. start
//		1. load a page
//		2. leave (or kill) 
// method:
//		00. command+T; 01. plus-button; 02. double-click; 03. File->New Tab;
//		10. URLbar ENTER; 11. URLbar go-button; 12. URLbar drop-down ENTER/click; 13. search-box ENTER; 14. search-box search-go-button; 15. top site/most visited; 16. bookmark bar; 17. bookmarks menu			
//		20. navigate away; 21. close
//


exports.dataStoreInfo = {

  fileName: "new_tab_study.sqlite", // created in user's profile directory
  tableName: "new_tab_study",
  columns: [
    {property: "timestamp", type: BaseClasses.TYPE_DOUBLE, displayName: "Time"},
    {property: "tabid", type: BaseClasses.TYPE_DOUBLE, displayName: "Unique tab ID"}, //this is same as the timestamp when the tab is created
    {property: "event", type: BaseClasses.TYPE_INT_32, displayName: "Event"},
    {property: "method", type: BaseClasses.TYPE_INT_32, displayName: "Method"},
    {property: "url", type: BaseClasses.TYPE_STRING, displayName: "URL"},
    {property: "clipboard", type: BaseClasses.TYPE_STRING, displayName: "Clip Board"},
    {property: "isclipboardurl", type: BaseClasses.TYPE_INT_32, displayName: "does Clip Board contain URL"}
  ]
};




//-------------------------------
// Define a per-window observer class by extending the generic one from
// BaseClasses:
function NewTabWindowObserver(window, globalInstance) {
  NewTabWindowObserver.baseConstructor.call(this, window, globalInstance);
}

BaseClasses.extend(NewTabWindowObserver,
                   BaseClasses.GenericWindowObserver);



// -----------------------------
// URL BAR STRING
NewTabWindowObserver.prototype.getUrlBarString = function() {
	try{
		let urlBar = this.window.document.getElementById("urlbar");
		arr = urlBar.value.split("/",3);
		domain_string = arr.join("/");
		return domain_string;
	}catch(err){
		dump("OH NO!!!!"+err+"\n");
		return "";
	}
	return "";
}




NewTabWindowObserver.prototype.newTabSelected = function(event) {
	var mtd = exports.handlers.method;
	var mtd_str = exports.handlers.method_string;
	exports.handlers.method = -1;
	exports.handlers.method_string = "";
	exports.handlers.urlbar_down_pressed = false;
	exports.handlers.searchbar_down_pressed = false;
	
	try{
		let urlBar = this.window.document.getElementById("urlbar");
		var arr = urlBar.value.split("/",3);
		var domain = arr.join("/");
	}catch(err){
		dump("[urlbar error] "+err+"\n");
		var domain = "";
	}
	//dump("Tab selected - " + domain + " - " + exports.handlers.current_tab_id + "\n");
	if( domain == "" )
	{
		//// START a new blank tab
		exports.handlers.current_tab_id = Date.now();
		if(mtd<0){
			mtd = METHODS.COMMAND_T;
			mtd_str = "METHODS.COMMAND_T";
		}
		// get clipbord data
		try {
			let clip = Cc["@mozilla.org/widget/clipboard;1"].getService(Components.interfaces.nsIClipboard);
			let trans = Cc["@mozilla.org/widget/transferable;1"].createInstance(Components.interfaces.nsITransferable);
  			trans.addDataFlavor("text/unicode");
			clip.getData(trans, clip.kGlobalClipboard);
			var str = new Object();
			var strLength = new Object();
			trans.getTransferData("text/unicode", str, strLength);
			if (str) {
				str = str.value.QueryInterface(Components.interfaces.nsISupportsString);
				var cbtext = str.data.substring(0, strLength.value / 2);
				cbtext = cbtext.substring(0,10);
				dump('clipboardData: '+cbtext+'\n');
				var isCbtextUrl = 0;
				if(cbtext.substring(0,4)=="http") isCbtextUrl = 1;
			}
		}catch(err2){
			var cbtext = "";
			dump("[clipboard error] "+err2+"\n");
		}
		
		dump("[START] "+Date.now()+","+exports.handlers.current_tab_id+","+EVENTS.START+","+ mtd_str+","+cbtext+"\n");			
		this.record ({
			timestamp:	Date.now(), 
			tabid:		exports.handlers.current_tab_id, 
			event:		EVENTS.START, 
			method:		mtd, 
			url:		"",
			clipboard:	cbtext,
			isclipboardurl: isCbtextUrl
		});		
	}else {
			if(exports.handlers.current_tab_id >0) {
				//// LEAVE a new tab			
				if(mtd<0){
					mtd = METHODS.LEAVE;
					mtd_str = "METHODS.LEAVE";
				}
				dump("[LEAVE]"+Date.now()+","+exports.handlers.current_tab_id+","+EVENTS.LEAVE+"," + mtd_str + "," + domain + "\n");
				this.record ({
					timestamp:	Date.now(), 
					tabid:		exports.handlers.current_tab_id, 
					event:		EVENTS.LEAVE, 
					method:		mtd, 
					url:		domain,
					clipboard:	"",
					isclipboardurl: -1
				});
				exports.handlers.current_tab_id = -1;
			}
	}
	
}


	

NewTabWindowObserver.prototype.newPageLoad = function(event) {
	var evt = exports.handlers.event;
	var evt_str = exports.handlers.event_string;
	var mtd = exports.handlers.method;
	var mtd_str = exports.handlers.method_string;
	
	exports.handlers.urlbar_down_pressed = false;
	exports.handlers.searchbar_down_pressed = false;
	exports.handlers.event = -1;
	exports.handlers.event_string = "";
	exports.handlers.method = -1;
	exports.handlers.method_string = "";
	
	var tid = exports.handlers.current_tab_id;
	var domain = this.getUrlBarString();
	
	if(tid>0 && mtd>0 && evt>0) {
		dump("[RECORD] "+Date.now()+","+tid+","+evt_str+","+mtd_str+","+domain+"\n");
		this.record ({
			timestamp:Date.now(), 
			tabid:		tid, 
			event:		evt, 
			method:		mtd, 
			url:		domain,
			clipboard:	"",
			isclipboardurl: -1
		});

	}
}





//.install() method will get called whenever a new window is opened
NewTabWindowObserver.prototype.install = function() {
	
	//dump("Starting to install listeners for NewTabWindowObserver. " +Date.now() +"\n");
	let window = this.window;
	let self = this;
	
	// ------------------------------------------------
	// 0. OPEN/ClOSE A NEW BLANK TAB
	
	//// Tab selection event detection
	//// if this is a new tab, initialize the current_tab_id
	//// otherwise current_tab_id is reset
	window.gBrowser.tabContainer.addEventListener("TabSelect", function() {self.newTabSelected();}, true);
	//window.gBrowser.tabContainer.addEventListener("TabOpen", function(evt){ dump("[open a tab]\n");}, false);
	window.gBrowser.tabContainer.addEventListener("TabClose", function(evt){
			dump("[close a tab]\n");
			exports.handlers.method = METHODS.CLOSE;
			exports.handlers.method_string = "METHODS.CLOSE";
	}, false);
    
	
	
	// ------------------------------------------------
	// 1. HOW TO OPEN A NEW TAB
	
	// 1.1 click the new tab button
    let tabBar = window.document.getElementById("TabsToolbar");
    this._listen(tabBar, "mouseup", function(evt) {
			if (evt.button == 0) {
				let targ = evt.originalTarget;
				if (targ.id == "new-tab-button" || targ.className == "tabs-newtab-button") {
					dump("---- click the new tab button (+)!!\n");
					exports.handlers.method = METHODS.PLUS_BTN;
					exports.handlers.method_string = "METHODS.PLUS_BTN";
				} 
			}
    }, false);
    
    // 1.3 double-click
    // double-click on tabbar may not open a new tab
    // even it opens a new tab, it cannot fire a "TabSelect" event
    this._listen(tabBar, "dblclick", function(evt) {
			dump("---- double click!!\n");
			exports.handlers.method = METHODS.DOUBLE_CLICK;
			exports.handlers.method_string = "METHODS.DOUBLE_CLICK";
			self.newTabSelected();
    }, false);
    
    // 1.2 File->New Tab
    let filemenubutton = window.document.getElementById("menu_newNavigatorTab");
    this._listen(filemenubutton, "command", function(evt){
    		//dump("---- FILE menu button!!" + evt.target.id + "," +evt.type+ "\n");
    		dump("---- FILE menu button!! \n");
    		exports.handlers.method = METHODS.COMMAND_T;
			exports.handlers.method_string = "METHODS.COMMAND_T";
    }, false);
    
    // 1.4 command+T
	
	
	
	// ----------------------------------------------------
	// 2. ACTIONS AFTER OPENNING A NEW TAB
	
	
	let appcontent = window.document.getElementById("appcontent");
	if (appcontent) {
		dump("add newpageload listener.\n");
		this._listen(appcontent, "DOMContentLoaded", this.newPageLoad, true);
	}					
	
	// 2.1 Search Bar
	
	// search bar dropdown
	let searchBarDropdown = window.document.getElementById("PopupAutoComplete");
	this._listen(searchBarDropdown, "click", function(evt){
			dump("[click search bar dropdown]");
			exports.handlers.event = EVENTS.LOAD_PAGE;
			exports.handlers.event_string = "EVENTS.LOAD_PAGE";
			exports.handlers.method = METHODS.SEARCH_DROP_CLICK;
			exports.handlers.method_string = "METHODS.SEARCH_DROP_CLICK";
	}, false);
	
	// Listen on search bar, by keyboard
	let searchBar = window.document.getElementById("searchbar");
	this._listen(searchBar, "keydown", function(evt) {
				if(evt.keyCode == 40) {
					exports.handlers.searchbar_down_pressed = true;
					dump("search bar down key pressed.\n");
				}
				if (evt.keyCode == 13) { 
					// Enter key
					if(exports.handlers.current_tab_id>0) {
						dump("searchbar enter.\n");
						exports.handlers.event = EVENTS.LOAD_PAGE;
						exports.handlers.event_string = "EVENTS.LOAD_PAGE";
						
						if(exports.handlers.searchbar_down_pressed)
						{
							exports.handlers.method = METHODS.SEARCH_DROP_ENTER;
				 			exports.handlers.method_string = "METHODS.SEARCH_DROP_ENTER";
						}else{
							exports.handlers.method = METHODS.SEARCH_ENTER;
				 			exports.handlers.method_string = "METHODS.SEARCH_ENTER";
						}						
					}
					exports.handlers.searchbar_down_pressed = false;
				}
	}, false);
	
	// Listen on search bar, by mouse
	this._listen(searchBar, "mouseup", function(evt) {
				 if (evt.originalTarget.getAttribute("anonid") == "search-go-button") {
					// Click search go button
					if(exports.handlers.current_tab_id>0) {
						dump("search bar click.\n");
				 		exports.handlers.event = EVENTS.LOAD_PAGE;
				 		exports.handlers.event_string = "EVENTS.LOAD_PAGE";
				 		exports.handlers.method = METHODS.SEARCH_GO_BTN;
				 		exports.handlers.method_string = "METHODS.SEARCH_GO_BTN";
					}
				 }
			   }, false);
	
	
	// 2.2 URL Bar
	// Listen on URL bar:
	let urlBar = window.document.getElementById("urlbar");
	this._listen(urlBar, "keydown", function(evt) {
				if(evt.keyCode == 40) {
					exports.handlers.urlbar_down_pressed = true;
					dump("url bar down key pressed.\n");
				}
				
				if (evt.keyCode == 13) { 
					// Enter key
					if(exports.handlers.current_tab_id>0) {
				 		exports.handlers.event = EVENTS.LOAD_PAGE;
				 		exports.handlers.event_string = "EVENTS.LOAD_PAGE";
						if(exports.handlers.urlbar_down_pressed)
						{
							exports.handlers.method = METHODS.BAR_DROP_ENTER;
				 			exports.handlers.method_string = "METHODS.BAR_DROP_ENTER";
						}else{
							exports.handlers.method = METHODS.BAR_ENTER;
				 			exports.handlers.method_string = "METHODS.BAR_ENTER";
						}						
					}
					exports.handlers.urlbar_down_pressed = false;
				}
			}, false);
	
	
	// URLbar click go-button
	let urlGoButton = window.document.getElementById("urlbar-go-button");
	this._listen(urlGoButton, "mouseup", function(evt) {
					// Click URL bar go button
					if(exports.handlers.current_tab_id>0) {
						dump('url bar go-button.\n');
				 		exports.handlers.event = EVENTS.LOAD_PAGE;
				 		exports.handlers.event_string = "EVENTS.LOAD_PAGE";
				 		exports.handlers.method = METHODS.BAR_GO_BTN;
				 		exports.handlers.method_string = "METHODS.BAR_GO_BTN";
					}
				 }, false);
	

	// Dropdown
	// Observe when the most-frequently-used menu in the URL bar is opened
	
	this._listen(urlBar, "command", function(evt) {
				 if (evt.originalTarget.getAttribute("anonid") == "historydropmarker") {
					// Click URL bar go button	
					if(exports.handlers.current_tab_id>0) {
						dump("bar drop button click.\n");
						exports.handlers.event = EVENTS.LOAD_PAGE;
				 		exports.handlers.event_string = "EVENTS.LOAD_PAGE";
				 		exports.handlers.method = METHODS.BAR_DROP_BUTTON;
				 		exports.handlers.method_string = "METHODS.BAR_DROP_BUTTON";						
					}
				 }
			   }, false);
	
	
	// Get clicks on items in URL bar drop-down
	
	let urlbarDropdown = window.document.getElementById("PopupAutoCompleteRichResult");
	this._listen(urlbarDropdown, "click", function(evt){
		if(exports.handlers.current_tab_id>0) {
			dump("url bar dropdown click!!!!!\n");			
			exports.handlers.event = EVENTS.LOAD_PAGE;
			exports.handlers.event_string = "EVENTS.LOAD_PAGE";
			exports.handlers.method = METHODS.BAR_DROP_CLICK;
			exports.handlers.method_string = "METHODS.BAR_DROP_CLICK";
		}
	});
	
	
	
	//2.3 Bookmarks
	
	// Bookmark main menu button -> bookmark item click
	
	let bookmarkmemu = window.document.getElementById("bookmarksMenuPopup");
	this._listen(bookmarkmemu, "command", function(evt){	
	    	dump("bookmark main menu click.\n");
			exports.handlers.event = EVENTS.LOAD_PAGE;
			exports.handlers.event_string = "EVENTS.LOAD_PAGE";
			exports.handlers.method = METHODS.BOOKMARK_MENU;
			exports.handlers.method_string = "METHODS.BOOKMARK_MENU";
	    }, true);



	// Bookmark bar click
	let bookmarkbar = window.document.getElementById("PlacesToolbar");
	this._listen(bookmarkbar, "click", function(evt){			
			if(exports.handlers.current_tab_id>0) {
				dump("bookmark bar clicked! id="+evt.target.id+"\n");
				exports.handlers.event = EVENTS.LOAD_PAGE;
				exports.handlers.event_string = "EVENTS.LOAD_PAGE";
				exports.handlers.method = METHODS.BOOKMARK_BAR;
				exports.handlers.method_string = "METHODS.BOOKMARK_BAR";
			}			
	}, true);
	
	
	//2.4 History
	
	let historymenu = window.document.getElementById("goPopup");
	    this._listen(historymenu, "command", function(evt){	    	
			dump("history click.\n");
			exports.handlers.event = EVENTS.LOAD_PAGE;
			exports.handlers.event_string = "EVENTS.LOAD_PAGE";
			exports.handlers.method = METHODS.HISTORY_MENU;
			exports.handlers.method_string = "METHODS.HISTORY_MENU";			
	    }
	    , true);
};






// -------------------------------
function NewTabGlobalObserver() {
  // Call base class constructor.  Must pass in the class name of the
  // per-window observer class we want to use; the base class will register
  // it so that an instance gets constructed on every window open.
  NewTabGlobalObserver.baseConstructor.call(this, NewTabWindowObserver);
  
}


BaseClasses.extend(NewTabGlobalObserver,
                   BaseClasses.GenericGlobalObserver);


/* Override the onExperimentStartup() method - this method gets called
 * when the experiment starts up (which means once when the experiment
 * starts for the first time, and then again every time Firefox restarts
 * until the experiment duration is over.) */
NewTabGlobalObserver.prototype.onExperimentStartup = function(store) {
  // "store" is a connection to the database table
	
	NewTabGlobalObserver.superClass.onExperimentStartup.call(this, store);

  /* Any code that you only want to run once per Firefox session
   * can go here.  It can install additional observers if you like.
   * You also have access to XPCOM components through predefined
   * symbols Cc and Ci: */

  let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);

//global variables
  this.current_tab_id = -1;  
  this.urlbar_down_pressed = false;
  this.searchbar_down_pressed = false;
  this.event = -1;
  this.event_string = "";
  this.method = -1;
  this.method_string = "";
  
};

/* Other methods of the bae class that you can override are:
 * .onNewWindow(window)
 * .onWindowClosed(window)
 * .onAppStartup()
 * .onAppShutdown()
 * .onExperimentStartup(store)
 * .onExperimentShutdown()
 * .onEnterPrivateBrowsing()
 * .onExitPrivateBrowsing()
 * .doExperimentCleanup() // browser config reset
 * all these methods are called automatically at the apprporate times. */




// Instantiate and export the global observer (required!)
exports.handlers = new NewTabGlobalObserver();


// Finally, we make the web content, which defines what will show up on the
// study detail view page.
function NewTabWebContent()  {
  NewTabWebContent.baseConstructor.call(this, exports.experimentInfo);
}

BaseClasses.extend(NewTabWebContent, BaseClasses.GenericWebContent);

NewTabWebContent.prototype.__defineGetter__("dataCanvas",
  function() {
      return '<h4>Frequencies of Domains:</h4><div id="data-plot-div"></div>' +
      	this.saveButtons + '</div>'
      	+'<h4>Browsing methods:</h4><div id="data-plot-div2"></div>' +
      	this.saveButtons + '</div>'
      	+'<div class="dataBox"><h3>View Your Data:</h3>' +
      	this.dataViewExplanation +
      	this.rawDataLink;
  });
NewTabWebContent.prototype.__defineGetter__("dataViewExplanation",
  function() {
    return "<p>The study is used to collect data about how users behave after opening a new tab.</p>"
    +"<p>During the study from <span id='study-start-date-span'></span> to <span id='study-end-date-span'></span>, you have opened <span id='new-tab-num-span'></span> new tabs and loaded pages in new tabs for <span id='pageload-num-span'></span> times.</p>"
    +"<p>The browsing frequency of the main domains:<div id='main-domain-num-span'></div></p>"
    +"<p>The frequency of loading a new page with different methods:<div id='method-freq-div'></div></p>"
    +"<p>Whether the clipboard contains a URL when opening a new tab:<div id='clipboard-freq-div'></div></p>";
  });

// This function is called when the experiment page load is done
NewTabWebContent.prototype.onPageLoad = function(experiment,
                                                  document,
                                                  graphUtils) {
  /* experiment is a reference to the live experiment Task object.
   * document is a reference to the experiment page document
   * graphUtils is a rerence to the Flot JS chart plotting library:
   * see http://code.google.com/p/flot/
   *
   * The basic idea here is to plot some kind of chart inside the div tag
   * that we defined in the dataCanvas getter in order to display the
   * experiment data to the user in an easily understood form.
   */
   
   experiment.getDataStoreAsJSON(function(rawData) {
   	var tab_counter = 0;
   	var pageload_counter = 0;
   	
   	var domains = new Array();
   	var domain_hash = new Object();
   	var domain_counter = 0;
   	
   	var clipboard_url = 0;
   	var clipboard_nonurl = 0;
   	
   	var mtd_hash = new Object();
   	for (var code in LOADPAGE_METHOD_NAMES) {
   		mtd_hash[code] = 0;
   	}

//	10: "UrlBar",
//	11: "SearchBar",
//	12: "Bookmarks",	
//	13: "History"
	
   	var start_timestamp = 0;
   	var last_timestamp = Date.now();
   	
   	for each (let row in rawData) {
   		var evt = row.event;
   		var ts = row.timestamp;
   		var url = row.url.toString();
   		var isclipboardurl = row.isclipboardurl;
   		if(start_timestamp==0)
   			start_timestamp = ts;
   		if(evt == EVENTS.START) {
   			tab_counter += 1;
   			if(isclipboardurl == 1) clipboard_url += 1;
   			else clipboard_nonurl += 1;
   		}
   		if(evt == EVENTS.LOAD_PAGE && url != "") {
   			pageload_counter += 1;
   			domains.push(url);
   			domain_hash[url] = 0;
   			mtd_hash[Math.floor(row.method/10)] += 1;
   		}
   	}
   	for each (let url in domains) {
   		domain_hash[url] += 1;
   	}
   	
   	let domainData = [];
   	var domain_string = "<ul>";
   	var i = 0;
   	for(var url in domain_hash) {
   		domain_string += "<li>"+url+":"+domain_hash[url]+"</li>";
   		domainData.push([i, domain_hash[url]]);
   		i += 1;
   	}
   	domain_string += "</ul>";
    domainData.sort(function(a, b) {return a[1] - b[1]})
    
    let methodData = [];
    let axisLabels = [];
    var i = 0;
    var mtd_string = "<ul>";
    for (var code in LOADPAGE_METHOD_NAMES) {
    	mtd_string += "<li>"+LOADPAGE_METHOD_NAMES[code]+":"+mtd_hash[code]+"</li>";
    	methodData.push([i, mtd_hash[code]]);
    	axisLabels.push([i, LOADPAGE_METHOD_NAMES[code]]);
    	i += 1;
    }
    mtd_string += "</ul>";
    
    let getFormattedDateString = function(timestamp) {
      let date = new Date(timestamp);
      let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug",
                  "Sep", "Oct", "Nov", "Dec"];
      return months[date.getMonth()] + " " + date.getDate() + ", "
        + date.getFullYear();
    };
    
   	let startSpan = document.getElementById("study-start-date-span");
    let endSpan = document.getElementById("study-end-date-span");
    if(startSpan) startSpan.innerHTML = getFormattedDateString(start_timestamp);
    if(endSpan) endSpan.innerHTML = getFormattedDateString(last_timestamp);
    
    let numNewtabSpan = document.getElementById("new-tab-num-span");
    if(numNewtabSpan) numNewtabSpan.innerHTML = tab_counter;
    
    let numDomainSpan = document.getElementById("main-domain-num-span");
    if(numDomainSpan) numDomainSpan.innerHTML = domain_string;
    
    let pageloadSpan = document.getElementById("pageload-num-span");
    if(pageloadSpan) pageloadSpan.innerHTML = pageload_counter;
    
    let clipboardFreqDiv = document.getElementById("clipboard-freq-div");
    if(clipboardFreqDiv) clipboardFreqDiv.innerHTML = "<ul><li>has a url: "+clipboard_url+"</li><li>doesn't have url:  "+clipboard_nonurl+"</li></ul>";
    
    let methodDiv = document.getElementById("method-freq-div");
    if(methodDiv) methodDiv.innerHTML = mtd_string;
    
    
    ///// PLOTTING
    
    let plotDiv = document.getElementById("data-plot-div");
    plotDiv.style.width="500px";
    plotDiv.style.height="300px";
    graphUtils.plot(plotDiv, [{label: "frequency of ranked domain",
                               data: domainData,
                               bars: {show: true}
                               }],
                    {xaxis: {},
                     yaxis: {},
                    }
                  );
    let plotDiv = document.getElementById("data-plot-div2");
    plotDiv.style.width="500px";
    plotDiv.style.height="300px";
    graphUtils.plot(plotDiv, [{label: "frequency of browsing methods",
                               data: methodData,
                               bars: {show: true}
                               }],
                    {xaxis: {ticks:axisLabels},
                     yaxis: {},
                    }
                  );

    
    
    
   });
   
};

// Instantiate and export the web content (required!)
exports.webContent = new NewTabWebContent();

// Register any code we want called when the study is unloaded:
require("unload").when(
  function destructor() {
    // Do any module cleanup here.
  });
