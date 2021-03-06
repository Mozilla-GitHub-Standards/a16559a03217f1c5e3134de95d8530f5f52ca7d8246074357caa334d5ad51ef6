// A Securable Module to be loaded with Cuddlefish.

const TYPE_INT_32 = 0;
const TYPE_DOUBLE = 1;

const TabsExperimentConstants = {
  // constants for event_code
  STUDY_STATUS: 0,
  OPEN_EVENT: 1,
  CLOSE_EVENT: 2,
  DRAG_EVENT: 3,
  DROP_EVENT: 4,
  SWITCH_EVENT: 5,
  LOAD_EVENT: 6,
  STARTUP_EVENT: 7,
  SHUTDOWN_EVENT: 8,
  OPEN_WINDOW_EVENT: 9,
  CLOSE_WINDOW_EVENT: 10,

  // constants for ui_method
  UI_CLICK: 1,
  UI_KEYBOARD: 2,
  UI_MENU: 3,
  UI_LINK: 4,
  UI_URLENTRY: 5,
  UI_SEARCH: 6,
  UI_BOOKMARK: 7,
  UI_HISTORY: 8
};

// TODO: Add in the idle detection stuff from Week-in-the-life?

const TABS_EXPERIMENT_FILE = "testpilot_tabs_experiment_results_2.sqlite";
/* In this schema, each row represents a single UI event. */
const TABS_TABLE_NAME = "testpilot_tabs_experiment_2";
const TAB_ID_ATTR = "TestPilotTabStudyTabId";
const WINDOW_ID_ATTR = "TestPilotTabStudyWindowId";
const LAST_TAB_ID = "tab_switch_study.last_tab_id";
const LAST_WINDOW_ID = "tab_switch_study.last_window_id";
const HOST_HASH_PREF = "tab_switch_study.host_hash";
const LAST_GROUP_ID = "tab_switch_study.last_group_id";

// TODO add columns:  parent_tab?
var TABS_EXPERIMENT_COLUMNS =  [
  {property: "event_code", type: TYPE_INT_32, displayName: "Event",
   displayValue: ["Study status", "Open", "Close", "Drag", "Drop", "Switch",
                  "Load", "Startup", "Shutdown", "Window Open", "Window Close"]},
  {property: "tab_id", type: TYPE_DOUBLE, displayName: "Tab ID"},
  {property: "tab_position", type: TYPE_INT_32, displayName: "Tab Pos."},
  {property: "tab_window", type: TYPE_INT_32, displayName: "Window ID"},
  {property: "ui_method", type: TYPE_INT_32, displayName: "UI Method",
   displayValue: ["", "Click", "Keyboard", "Menu", "Link", "URL Entry", "Search",
              "Bookmark", "History"]},
  {property: "tab_site_hash", type: TYPE_INT_32, displayName: "Tab Group ID"},
  {property: "is_search_results", type: TYPE_INT_32, displayName: "Search results?"},
  {property: "num_tabs", type: TYPE_INT_32, displayName: "Num. Tabs"},
  {property: "timestamp", type: TYPE_DOUBLE, displayName: "Time",
   displayValue: function(value) {return new Date(value).toLocaleString();}}
];


exports.experimentInfo = {
  startDate: null, // Null start date means we can start immediately.
  duration: 5, // Days
  testName: "Tab Switch Study",
  testId: 5,
  testInfoUrl: "https://testpilot.mozillalabs.com/testcases/tab-open-close.html",
  summary: "This 5-day study aims to understand how people switch between \
tabs. The result of this study will help Firefox team design better ways \
for people to manage their tabs. ",
  thumbnail: "https://testpilot.mozillalabs.com/testcases/tab-open-close/tab-switch-thumbnail.png",
  optInRequired: false,
  recursAutomatically: false,
  recurrenceInterval: 0,
  versionNumber: 2 // for minor changes in format within the same experiment
};

exports.dataStoreInfo = {
  fileName: TABS_EXPERIMENT_FILE,
  tableName: TABS_TABLE_NAME,
  columns: TABS_EXPERIMENT_COLUMNS
};

let ObserverHelper = {
  _nextWindowId: 1,
  _nextTabId: 0,
  _nextTabGroupId: 0,
  _hostHash: {},
  _installedObservers: [],
  _dataStore: null,
  privateMode: false,

  _sessionStore: null,
  get sessionStore() {
    if (!this._sessionStore) {
      this._sessionStore = Cc["@mozilla.org/browser/sessionstore;1"]
                    .getService(Ci.nsISessionStore);
    }
    return this._sessionStore;
  },

  _prefBranch: null,
  get prefBranch() {
    if (!this._prefBranch) {
      let prefs = Cc["@mozilla.org/preferences-service;1"]
                    .getService(Ci.nsIPrefService);
      this._prefBranch = prefs.getBranch("extensions.testpilot.");
    }
    return this._prefBranch;
  },

  _ioService: null,
  get ioService() {
    if (!this._ioService) {
      this._ioService = Cc["@mozilla.org/network/io-service;1"]
                      .getService(Ci.nsIIOService);
    }
    return this._ioService;
  },

  getTabGroupIdFromUrl: function(url) {
    // TODO this next line can sometimes throw a data:no exception.
    // If left untreated this will stop load from getting recorded.
    if (url == "about:blank") {
      return -1;
    }
    let host = this.ioService.newURI(url, null, null).host;

    if (this._hostHash[host] == undefined) {
      this._hostHash[host] = this._nextTabGroupId;
      this._nextTabGroupId ++;
      this.prefBranch.setCharPref(HOST_HASH_PREF,
                                  JSON.stringify(this._hostHash));
      this.prefBranch.setIntPref(LAST_GROUP_ID, this._nextTabGroupId);
    }
    return this._hostHash[host];
  },

  isUrlSearchResults: function(url) {
    let path = this.ioService.newURI(url, null, null).path;
    let query = path.split("?").pop();
    let args = query.split("&");
    for each (let arg in args) {
      if (arg.indexOf("q=") == 0 || arg.indexOf("query=") == 0) {
        return true;
      }
    }
    if (path.indexOf("search") > -1 && args.length > 1) {
      return true;
    }
    return false;
  },

  _getNextWindowId: function() {
    let id = this._nextWindowId;
    this._nextWindowId ++;
    this.prefBranch.setIntPref(LAST_WINDOW_ID, this._nextWindowId);
    return id;
  },

  getNextTabId: function ObserverHelper_getNextTabId() {
    let tabId = this._nextTabId;
    this._nextTabId ++;
    this.prefBranch.setIntPref(LAST_TAB_ID, this._nextTabId);
    return tabId;
  },

  _getIdFromWindow: function(window) {
    let id = this.sessionStore.getWindowValue(window, WINDOW_ID_ATTR);
    if (id == "") {
      return null;
    } else {
      return id;
    }
  },

  _getObserverForWindow: function(window) {
    let windowId = this._getIdFromWindow(window);
    if (!windowId) {
      return null;
    }
    for (let i = 0; i < this._installedObservers.length; i++) {
      if (this._installedObservers[i]._windowId == windowId) {
        return this._installedObservers[i];
      }
    }
    return null;
  },

  _registerWindow: function(window) {
    // First check window doesn't already have registration, so that this
    // function can be called multiple times with no ill effect:
    let windowId = this._getIdFromWindow(window);
    if (windowId) {
      if (this._getObserverForWindow(window)) {
        return;
      }
    }

    // OK, we don't already have registration on this window... start one
    if (!windowId) {
      // Create and store a new window ID:
      windowId = this._getNextWindowId();
      this.sessionStore.setWindowValue(window, WINDOW_ID_ATTR, windowId);
    }
    let newObserver = new TabWindowObserver(window, windowId, this._dataStore);
    this._installedObservers.push(newObserver);
  },

  cleanup: function() {
    // Uninstall all installed observers
    for (let i = 0; i < this._installedObservers.length; i++) {
      this._installedObservers[i].uninstall();
    }
    this._installedObservers = [];
  },

  // for handlers API:
  onNewWindow: function(window) {
    // Create an observer for each window.
    this._registerWindow(window);
    let id = this._getIdFromWindow(window);
    console.info("Pushed a tab observer in onNewWindow.");

    // Record the window-opening event:
    if (!this.privateMode) {
      this._dataStore.storeEvent({
        event_code: TabsExperimentConstants.OPEN_WINDOW_EVENT,
        timestamp: Date.now(),
        num_tabs: window.getBrowser().tabContainer.itemCount,
        tab_window: id
      });
    }
  },

  onWindowClosed: function(window) {
    let observer = this._getObserverForWindow(window);
    if (observer) {
      console.info("Uninstalled a tab observer in onWindowClosed.");
      observer.uninstall();
      let index = this._installedObservers.indexOf(observer);
      this._installedObservers.splice(index, 1);
    }

    // Record the window-closing event:
    let windowId = this._getIdFromWindow(window);
    if (!this.privateMode) {
      this._dataStore.storeEvent({
        event_code: TabsExperimentConstants.CLOSE_WINDOW_EVENT,
        timestamp: Date.now(),
        tab_window: windowId
      });
    }
  },

  onAppStartup: function() {
    // Record app startup event:
    this._dataStore.storeEvent({
      event_code: TabsExperimentConstants.STARTUP_EVENT,
      timestamp: Date.now()
    });
  },

  onAppShutdown: function() {
    this._dataStore.storeEvent({
      event_code: TabsExperimentConstants.SHUTDOWN_EVENT,
      timestamp: Date.now()
    });
  },

  onExperimentStartup: function(store) {
    this._dataStore = store;

    if (this.prefBranch.prefHasUserValue(LAST_WINDOW_ID)) {
      this._nextWindowId = this.prefBranch.getIntPref(LAST_WINDOW_ID);
    }
    if (this.prefBranch.prefHasUserValue(LAST_TAB_ID)) {
      this._nextTabId = this.prefBranch.getIntPref(LAST_TAB_ID);
    }
    if (this.prefBranch.prefHasUserValue(LAST_GROUP_ID)) {
      this._nextTabGroupId = this.prefBranch.getIntPref(LAST_GROUP_ID);
    }
    if (this.prefBranch.prefHasUserValue(HOST_HASH_PREF)) {
      this._hostHash = JSON.parse(this.prefBranch.getCharPref(HOST_HASH_PREF));
    }

    let tabOpenRelativeSetting = this.getTabOpenRelativeSetting()?1:0;

    // Record study metadata.  Note that we're totally abusing the schema and
    // overloading the columns with different meanings -
    // using tab_id to store the study version number
    // and using tab_position to store the tabOpenRelative preference.
    // This is lame but much easier than adding dedicated columns for this one event.
    this._dataStore.storeEvent({
      event_code: TabsExperimentConstants.STUDY_STATUS,
      tab_id: exports.experimentInfo.versionNumber,
      tab_position: tabOpenRelativeSetting,
      timestamp: Date.now()
    });

    // Install observers on all windows that are already open:
    console.info("Trying to install observers on already open windows.");
    let wm = Cc["@mozilla.org/appshell/window-mediator;1"]
                    .getService(Ci.nsIWindowMediator);
    let enumerator = wm.getEnumerator("navigator:browser");
    while(enumerator.hasMoreElements()) {
      let win = enumerator.getNext();
      this._registerWindow(win);
    }
    console.info("I did it.");
  },

  onExperimentShutdown: function() {
    console.info("Shutting down experiment, cleaning up observers.");
    this.cleanup();
  },

  onEnterPrivateBrowsing: function() {
    // Don't record any events when in private mode
    this.privateMode = true;
  },

  onExitPrivateBrowsing: function() {
    this.privateMode = false;
  },

  getTabOpenRelativeSetting: function() {
    let prefs = Cc["@mozilla.org/preferences-service;1"]
                    .getService(Ci.nsIPrefBranch);
    let setting = prefs.getBoolPref("browser.tabs.insertRelatedAfterCurrent");
    return setting;
  }

};

exports.handlers = ObserverHelper;

/* Ensure that when this module is unloaded, all observers get uninstalled
 * too. */
require("unload").when(
  function myDestructor() {
    ObserverHelper.cleanup();
  });


// The per-window observer class:
function TabWindowObserver(window, windowId, store) {
  this._init(window, windowId, store);
};
TabWindowObserver.prototype = {
  _init: function TabsExperimentObserver__init(window, windowId, store) {
    this._lastEventWasClick = null;
    this._window = window;
    this._dataStore = store;
    this._windowId = windowId;
    this._registeredListeners = [];
    this.install();
  },

  _listen: function TEO__listen(container, eventName, method, catchCap) {
    // Keep a record of this so that we can automatically unregister during
    // uninstall:
    let self = this;
    let handler = function(event) {
      method.call(self, event);
    };
    container.addEventListener(eventName, handler, catchCap);

    this._registeredListeners.push(
      {container: container, eventName: eventName, handler: handler,
       catchCap: catchCap});
  },

  install: function TabsExperimentObserver_install() {
    let self = this;
    let browser = this._window.getBrowser();
    let container = browser.tabContainer;
    console.info("Installing tabsExperimentObserver on a window!");
    // Can we catch the click event during the capturing phase??
    // last argument of addEventListener is true to catch during capture, false to catch during bubbling.

    this._listen(container, "TabOpen", this.onTabOpened, false);
    this._listen(container, "TabClose", this.onTabClosed, false);
    this._listen(container, "TabSelect", this.onTabSelected, false);
    this._listen(container, "dragstart", this.onDragStart, false);
    this._listen(container, "drop", this.onDrop, false);
    // TODO what other events can we listen for here?  What if we put the
    // listener on the browser or the window?

    this._listen(container, "mousedown", this.onClick, true);
    this._listen(container, "mouseup", this.onMouseUp, true);
    //this._listen(container, "keydown", this.onKey, true);

    // apparently there are events called ondragover, ondragleave, ondragstart,
    // ondragend, and ondrop.

    // For URL loads, we register a DOMContentLoaded on the appcontent:
    let appcontent = this._window.document.getElementById("appcontent");
    if (appcontent) {
      this._listen(appcontent, "DOMContentLoaded", this.onUrlLoad, true);
    }
  },

  _recordEvent: function TabsExperimentObserver__recordEvent(tab,
                                                             evtCode,
                                                             uiMethod,
                                                             overrides) {
    if (!overrides) {
      overrides = {};
    }
    // TODO gets an error msg that 'getIndexOfItem' is not function...
    // (when called from load events)
    let index = tab.parentNode.getIndexOfItem(tab);
    let count = tab.parentNode.itemCount;
    let sStore = ObserverHelper.sessionStore;
    let tabId = sStore.getTabValue(tab, TAB_ID_ATTR);
    /* If tab doesn't have an ID, assign it one now (doing it just-in-time
     * ensures every tab gets an ID whether it came from SessionStore or
     * whether it was just open.) */
    if (tabId == "") {
      tabId = ObserverHelper.getNextTabId();
      sStore.setTabValue( tab, TAB_ID_ATTR, tabId);
    }
    let url = this.getUrlInTab(index);
    let groupId = ObserverHelper.getTabGroupIdFromUrl(url);
    let isSearch = ObserverHelper.isUrlSearchResults(url);

    let windowId = this._windowId;
    if (!ObserverHelper.privateMode) {
      this._dataStore.storeEvent({
        event_code: evtCode,
        timestamp: Date.now(),
        tab_id: overrides.tabId ? overrides.tabId : tabId,
        tab_position: overrides.index ? overrides.index : index,
        num_tabs: overrides.count ? overrides.count : count,
        ui_method: uiMethod,
        tab_window: overrides.windowId ? overrides.windowId : windowId,
        tab_site_hash: overrides.group? overrides.group: groupId,
        is_search_results: isSearch
      });
    }
  },

  uninstall: function TabsExperimentObserver_uninstall() {
    for (let i = 0; i < this._registeredListeners.length; i++) {
      let rl = this._registeredListeners[i];
      rl.container.removeEventListener(rl.eventName, rl.handler, rl.catchCap);
    }
  },

  onClick: function TabsExperimentObserver_onClick(event) {
    console.info("You clicked on tabs bar.");
    this._lastEventWasClick = true;
  },

  onMouseUp: function TabsExperimentObserver_onMouseUp(event) {
    console.info("You released your click on the tabs bar.");
    this._lastEventWasClick = false;
  },

  onDragStart: function TabsExperimentObserver_onDragStart(event) {
    console.info("You started dragging a tab.");
    this._recordEvent(event.target, TabsExperimentConstants.DRAG_EVENT,
                      TabsExperimentConstants.UI_CLICK);
  },

  onDrop: function TabsExperimentObserver_onDrop(event) {
    console.info("You dropped a dragged tab.");
    console.info("Index is " + index );
    this._recordEvent(event.target, TabsExperimentConstants.DROP_EVENT,
                      TabsExperimentConstants.UI_CLICK);
  },

  getUrlInTab: function TabsExperimentObserver_getUrlInTab(index) {
    let tabbrowser = this._window.getBrowser();
    let currentBrowser = tabbrowser.getBrowserAtIndex(index);
    if (!currentBrowser.currentURI) {
      return null;
    }
    return currentBrowser.currentURI.spec;
  },

  onUrlLoad: function TabsExperimentObserver_onUrlLoaded(event) {
    // TODO: Doesn't get called when you do back or forward?
    let url = event.originalTarget.URL;
    // event.originalTarget is the document inside the tab.  From there unfortunately
    // we have a very roundabout way of getting to the tab element itself...
    let tabBrowserSet = this._window.getBrowser();
    let browser = tabBrowserSet.getBrowserForDocument(event.originalTarget);
    if (!browser) {
      // This happens sometimes and I'm not sure why.
      console.warn("Tab load event: browser undefined.");
      return;
    }
    let index = null;
    for (let i = 0; i < tabBrowserSet.browsers.length; i ++) {
      if (tabBrowserSet.getBrowserAtIndex(i) == browser) {
	index = i;
	break;
      }
    }
    if (index == null ) {
      console.warn("Tab load event: index not found.");
      return;
    }
    let container = this._window.getBrowser().tabContainer;
    let tab = container.children[index];

    // TODO UI method
    this._recordEvent(tab, TabsExperimentConstants.LOAD_EVENT,
                      TabsExperimentConstants.UI_CLICK);
  },

  onTabOpened: function TabsExperimentObserver_onTabOpened(event) {
    console.info("Tab opened. Last event was click? " + this._lastEventWasClick );
    // TODO Not registering click here on open events -- because mouse up and
    // mousedown both happen before the tab open event.
    let uiMethod = this._lastEventWasClick ? TabsExperimentConstants.UI_CLICK:TabsExperimentConstants.UI_KEYBOARD;
    console.info("Recording uiMethod of " + uiMethod );
    let url = this.getUrlInTab(index);
    if (url == "about:blank") {
      // Url will be undefined if you open a new blank tab, but it will be
      // "about:blank" if you opened the tab through a link (or by opening a
      // recently-closed tab from the history menu).  Go figure.
      uiMethod = TabsExperimentConstants.UI_LINK;
    }
    this._recordEvent(event.target, TabsExperimentConstants.OPEN_EVENT,
                      uiMethod);
  },

  onTabClosed: function TabsExperimentObserver_onTabClosed(event) {
    console.info("Tab closed.");

    // TODO not registering click here on close events.
    // cuz mouseup and mousedown both happen before the tab open event.
    let uiMethod = this._lastEventWasClick ? TabsExperimentConstants.UI_CLICK:TabsExperimentConstants.UI_KEYBOARD;
    this._recordEvent(event.target, TabsExperimentConstants.CLOSE_EVENT,
                      uiMethod);
  },

  onTabSelected: function TabsExperimentObserver_onTabSelected(event) {
    // TODO there is an automatic tab-selection event after each open and
    // after each close.  Right now these get listed as 'keyboard', which is
    // not accurate.  Should we try to figure them out and mark them as auto-
    // matic?
    console.info("Tab selected.  Last event was click? " + this._lastEventWasClick );
    let uiMethod = this._lastEventWasClick ? TabsExperimentConstants.UI_CLICK:TabsExperimentConstants.UI_KEYBOARD;

    console.info("Recording uiMethod of " + uiMethod );
    this._recordEvent(event.target, TabsExperimentConstants.SWITCH_EVENT,
                      uiMethod);
  }
};


const FINE_PRINT = '<h3>The fine print:</h3>\
  <ul>\
  <li>The websites (URLs) that you visit will never be recorded.</li>\
  <li>At the end of the test, you will be able to choose if you want to submit \
  your test data or not.</li>\
  <li>All test data you submit will be anonymized and will not be personally \
  identifiable.</li>\
  </ul>';

const DATA_CANVAS = '<div class="dataBox">\
  <h3>View Your Data:</h3>\
  <p>In the chart below, each rectangle represents a tab.  The arcs represent\
  switches between tabs.  The thicker the arc line is, the more times you have\
  switched between those two tabs.  (The rectangles in this chart\
  do not change even if you have closed or rearranged some of the tabs.)\
  <p><a onclick="showRawData(5);">Click here</a> to see a display of all\
  the collected data in its raw form, exactly as it will be sent.</p>\
  <canvas id="tab-switch-arcs" width="450" height="680"></canvas></div>\
  <div><button type="button" onclick="saveCanvas(document.getElementById(\'tab-switch-arcs\'))">Save Graph</button>\
  &nbsp;&nbsp;<button type="button" onclick="exportData();">Export Data</button></div>';

exports.webContent = {
  upcomingHtml: "",    // For tests which don't start automatically, this gets
                       // displayed in status page before test starts.

  inProgressDataPrivacyHtml: '<p>The study will end in 5 days. <b>At the end \
    of it, you will be prompted to choose whether you want to submit your test \
    data or not.</b> All test data you submit will be anonymized and will not \
    be personally identifiable. We do not record any search terms or what \
    sites you visit.</p>',

  inProgressHtml: '<h2>Thank you, Test Pilot!</h2>\
    <p><b>You are currently in a study to help us understand how tabs are \
    used.</b></p>\
    <p>Read more details for the \
    <a onclick="openLink(\'https://testpilot.mozillalabs.com/testcases/tabswitch\')">\
    "Tab Switch"</a> study.</p>\
    <p>You can save your test graph or export the raw data now, or after you \
    submit your data.</p>\
    <p>If you think there is an error in this data, \
    <a onclick="openLink(\'http://groups.google.com/group/mozilla-labs-testpilot\')">\
    click here to post</a> a message to notify the Test Pilot team about it</p>\
    <p>If you are not comfortable participating this time, please \
    <a href="chrome://testpilot/content/status-quit.html?eid=5">click here \
    to quit</a>.</p>'
    + DATA_CANVAS,

  completedDataPrivacyHtml: '<p>All test data you submit will be \
    anonymized and will not be personally identifiable. The data you submit \
    will help us directly with improvements to the tab management interface. \
    <b>After we analyze the data from all submissions, you will be able to see \
    all new study findings by clicking on the Test Pilot icon on the \
    bottom-right corner and choosing "All your studies".</b></p>',

  completedHtml: '<h2>Excellent! You just finished the "Tab Switch" Study!</h2>\
    <b>The study is complete and your test data is ready to submit!</b>\
    <p>You have 7 days to decide if you want to submit your data.  7 days \
    after the study is complete, your data will be automatically removed from \
    your computer if you don\'t submit it.</p>\
    <p>You can save your graph or export the raw data now or after you submit \
    you data.</p>\
    <p>If you think there is an error in this data, \
    <a onclick="openLink(\'http://groups.google.com/group/mozilla-labs-testpilot\')">\
    click here to post</a> a message to notify the test pilot team about it</p>\
    <p>If you choose to cancel the study now, your data will be removed from \
    your computer immediately. You won\'t be able to see your chart or the raw \
    data after you cancel the study. You can <a \
    href="chrome://testpilot/content/status-quit.html?eid=5">click here to \
    cancel</a>.</p> \
    <p>&nbsp;</p>\
    <div class="home_callout_continue">\
    <img class="homeIcon" src="chrome://testpilot/skin/images/home_computer.png">\
    <span id="upload-status"><a onclick="uploadData();">Submit your \
    data &raquo;</a></span></div>'
    + DATA_CANVAS,

  dataExpiredDataPrivacyHtml: '',

  dataExpiredHtml: '<h2>Your \
    <a onclick="openLink(\'https://testpilot.mozillalabs.com/testcases/tabswitch\')">\
    "Tab Switch"</a> study data is expired.</h2> \
    <p>It has been more than 7 days since the study is completed. Since you \
    decide not to submit the data, it has been removed automatically from your \
    computer.  Sorry we won\'t be able to show your data anymore.',

  canceledDataPrivacyHtml: '',

  canceledHtml: '<h2>You canceled the \
    <a onclick="openLink(\'https://testpilot.mozillalabs.com/testcases/tabswitch\')">\
    "Tab Switch"</a> study.</h2> \
    <p>You have canceled this study so your data is removed. Sorry we won\'t \
    be able to show your data anymore.</p> \
    <p>Test Pilot will offer you new studies and surveys as they become \
    available.</p>',

  remainDataDataPrivacyHtml: '',

  remainDataHtml: '<h2>Thank you for submitting your \
    <a onclick="openLink(\'https://testpilot.mozillalabs.com/testcases/tabswitch\')">\
    "Tab Switch"</a> study data!</h2> \
    <p>Please remember to save your test graph or export the raw data now if \
    you are interested!</p>\
    <p>If you choose not to save them, they will be removed from your computer \
    7 days after your submission.</p>'
    + DATA_CANVAS,

  deletedRemainDataDataPrivacyHtml: '',

  deletedRemainDataHtml: '<h2>Your \
    <a onclick="openLink(\'https://testpilot.mozillalabs.com/testcases/tabswitch\')">\
    "Tab Switch"</a> study data is removed.</h2> \
    <p>All the data that was collected has been transmitted to Mozilla and \
    removed from your computer.</p> \
    <p>The results of the study will be available soon.  When they are ready \
    to view, Test Pilot will let you know.</p>',

  onPageLoad: function(experiment, document, graphUtils) {
    // Get raw data:
    let rawData = experiment.dataStoreAsJSON;
    // Graph it:
    if (rawData.length == 0) {
      return;
    }

    let canvas = document.getElementById("tab-switch-arcs");
    let ctx = canvas.getContext("2d");
    let prefBranch = ObserverHelper.prefBranch;
    let maxTab; /* Read it out of prefs instead of calling ObserverHelper._nextTabId
     * because onExperimentStartup() may not have been called, if the experiment is
     * done collecting data. */
    if (prefBranch.prefHasUserValue(LAST_TAB_ID)) {
      maxTab = prefBranch.getIntPref(LAST_TAB_ID) + 1;
    } else {
      maxTab = 1;
    }

    // zero-fill 2-d array:
    let i, j;
    let switchCounts = new Array(maxTab + 1);
    for (i = 0; i <= maxTab; i++) {
      switchCounts[i] = new Array(maxTab + 1);
      for (j = 0; j <= maxTab; j++) {
        switchCounts[i][j] = 0;
      }
    }
    // Count switch events by id.  switchCounts[i][j] holds
    // the number of switch events from tab id i to tab id j.
    let prevTabId = null;
    for each ( let row in rawData) {
      if (row.event_code != TabsExperimentConstants.SWITCH_EVENT) {
        continue;
      }
      let thisTabId = row.tab_id;
      if (prevTabId != null) {
        // For some reason, we can sometimes get tabs with a higher ID than
        // maxTab?  I don't know why, but no reason to die...
        if (!switchCounts[prevTabId]) {
          switchCounts[prevTabId] = [];
        }
        if (!switchCounts[prevTabId][thisTabId]) {
          switchCounts[prevTabId][thisTabId] = 0;
        }
        switchCounts[prevTabId][thisTabId] ++;
      }
      prevTabId = thisTabId;
    }

    //Draw a rectangle for each tab.

    for (i = 0; i < maxTab; i++) {
      ctx.strokeRect(5, 5 + i * 20, 35, 20 + i * 20);
    }

    // Draw arcs between each rectangle with line weight proportional
    // to number of switches.
    for (i = 0; i < maxTab; i++) {
      for (j = i+1; j < maxTab; j++) {
        // don't care about direction of the switch here
        let total = switchCounts[i][j] + switchCounts[j][i];
        let yTop = 10 + i * 20;
        let yBottom = 10 + j * 20;
        let radius = (yBottom - yTop) / 2;
        let yCenter = (yBottom + yTop) / 2;
        if (total > 0) {
          ctx.lineWidth = total / 5;
          if (total/5 > 6) {
            ctx.lineWidth = 6;
          }
          ctx.arc(40, yCenter, radius, -1 * Math.PI / 2, Math.PI / 2, false);
          ctx.stroke();
          ctx.lineWidth = 1;
        }
      }
    }
  }
};