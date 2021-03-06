/* Basic panel experiment */
BaseClasses = require("study_base_classes.js");

exports.experimentInfo = {
  startDate: null,
  duration: 7,
  testName: "A Week in the Life of a Browser (v2)",
  testId: 12,
  testInfoUrl: "https://testpilot.mozillalabs.com/testcases/aweeklife2",
  summary: "This auto-recurring study aims to explore larger trends of how "
           + "the browser is being used over time. It will periodically collect "
           + "data on the browser's basic performance for one week, running "
           + "the same study again every 30 days, from Oct. 2010 to "
           + "Oct. 2011.",
  thumbnail: "https://testpilot.mozillalabs.com/testcases/a-week-life/week-life-thumbnail.png",
  optInRequired: false,
  recursAutomatically: true,
  recurrenceInterval: 30,
  versionNumber: 6,
  minTPVersion: "1.0rc1",
  minFXVersion: "3.5",
  runOrNotFunc: function() {
    //Don't run if on Firefox 4b10 and Mac OS 10.6.6.
     let version = Cc["@mozilla.org/xre/app-info;1"]
      .getService(Ci.nsIXULAppInfo).version;
     let os = Cc["@mozilla.org/network/protocol;1?name=http"]
       .getService(Ci.nsIHttpProtocolHandler).oscpu;
    return (version != "4.0b10" || os.indexOf("Mac OS X 10.6") == -1);
  }
};

const WeekEventCodes = {
  STUDY_STATUS: 0,
  BROWSER_START: 1,
  BROWSER_SHUTDOWN: 2,
  BROWSER_RESTART: 3,
  BROWSER_ACTIVATE: 4,
  BROWSER_INACTIVE: 5,
  SEARCHBAR_SEARCH: 6,
  SEARCHBAR_SWITCH: 7,
  BOOKMARK_STATUS: 8,
  BOOKMARK_CREATE: 9,
  BOOKMARK_CHOOSE: 10,
  BOOKMARK_MODIFY: 11,
  DOWNLOAD: 12,
  DOWNLOAD_MODIFY: 13,
  ADDON_STATUS: 14,
  ADDON_INSTALL: 15,
  ADDON_UNINSTALL: 16,
  PRIVATE_ON: 17,
  PRIVATE_OFF: 18,
  MEMORY_USAGE:19,
  SESSION_ON_RESTORE:20,
  SESSION_RESTORE: 21, // NOT USED
  PLUGIN_VERSION:22,
  HISTORY_STATUS: 23,
  PROFILE_AGE: 24,
  SESSION_RESTORE_PREFERENCES: 25,
  NUM_TABS: 26,
  STARTUP_TIME: 27
};

var eventCodeToEventName = ["Study Status", "Firefox Startup", "Firefox Shutdown",
                            "Firefox Restart", "Resume Active Use",
                            "Begin Idle", "Search", "Search Settings Changed",
                            "Bookmark Count", "New Bookmark", "Bookmark Opened",
                            "Bookmark Modified", "Download",
                            "Download Settings Changed", "Add-ons Count",
                            "Add-on Installed", "Add-on Uninstalled",
                            "Private Mode On", "Private Mode Off", "Memory Usage",
                            "Total Windows/Tabs in about:sessionrestore",
                            "Actual Restored Windows/Tabs", "Plugin Version",
                            "History Count", "Profile Age",
                            "Session Restore Preferences",
                            "Num Windows/Tabs", "Startup Time"];

exports.dataStoreInfo = {
  fileName: "testpilot_week_in_the_life_v2_results.sqlite",
  tableName: "week_in_the_life_v2",
  columns: [{property: "event_code", type: BaseClasses.TYPE_INT_32, displayName: "Event",
             displayValue: eventCodeToEventName},
            {property: "data1", type: BaseClasses.TYPE_STRING, displayName: "Data 1"},
            {property: "data2", type: BaseClasses.TYPE_STRING, displayName: "Data 2"},
            {property: "data3", type: BaseClasses.TYPE_STRING, displayName: "Data 3"},
            {property: "timestamp", type: BaseClasses.TYPE_DOUBLE, displayName: "Time",
             displayValue: function(value) {return new Date(value).toLocaleString();}}]
};

var BookmarkObserver = {
  alreadyInstalled: false,
  bmsvc: null,

  install: function() {
     /* See
     https://developer.mozilla.org/en/nsINavBookmarkObserver and
     https://developer.mozilla.org/en/nsINavBookmarksService
      */
    if (!this.alreadyInstalled) {
      console.info("Adding bookmark observer.");
      this.bmsvc = Cc["@mozilla.org/browser/nav-bookmarks-service;1"]
        .getService(Ci.nsINavBookmarksService);
      this.lmsvc = Cc["@mozilla.org/browser/livemark-service;2"]
        .getService(Ci.nsILivemarkService);
      this.bmsvc.addObserver(this, false);
      this.alreadyInstalled = true;
    }
  },

  runGlobalBookmarkQuery: function() {
    // Run once on startup to count bookmarks, folders, and depth of
    // folders.
    let historyService = Cc["@mozilla.org/browser/nav-history-service;1"]
                               .getService(Ci.nsINavHistoryService);
    let totalBookmarks = 0;
    let totalFolders = 0;
    let greatestDepth = 0;
    let rootFolders = [ this.bmsvc.toolbarFolder,
                        this.bmsvc.bookmarksMenuFolder,
                        this.bmsvc.tagsFolder,
                        this.bmsvc.unfiledBookmarksFolder];
    let lmsvc = this.lmsvc;
    let bmsvc = this.bmsvc;
    let digIntoFolder = function(folderID, depth) {
      let options = historyService.getNewQueryOptions();
      let query = historyService.getNewQuery();
      query.setFolders([folderID], 1);
      let result = historyService.executeQuery(query, options);
      let rootNode = result.root;
      rootNode.containerOpen = true;
      if (rootNode.childCount > 0) {
        // don't count livemarks
        let folderId = bmsvc.getFolderIdForItem( rootNode.getChild(0).itemId );
        if (!lmsvc.isLivemark(folderId)) {
          // iterate over the immediate children of this folder, recursing
          // into any subfolders
          for (let i = 0; i < rootNode.childCount; i ++) {
            let node = rootNode.getChild(i);
            if (node.type == node.RESULT_TYPE_FOLDER) {
              totalFolders ++;
              digIntoFolder(node.itemId, depth + 1);
            } else {
              totalBookmarks ++;
            }
          }
        }
      }
      // close a container after using it!
      rootNode.containerOpen = false;
      if (depth > greatestDepth) {
        greatestDepth = depth;
      }
    };

    let rootFolder;
    for each (rootFolder in rootFolders) {
      digIntoFolder(rootFolder, 0);
    }
    exports.handlers.record(WeekEventCodes.BOOKMARK_STATUS,
                            totalBookmarks + " total bookmarks",
                            totalFolders + " folders",
                            "folder depth " + greatestDepth);
  },

  uninstall: function() {
    if (this.alreadyInstalled) {
      this.bmsvc.removeObserver(this);
      this.alreadyInstalled = false;
    }
  },

  onItemAdded: function(itemId, parentId, index, type) {
    let folderId = this.bmsvc.getFolderIdForItem(itemId);
    if (!this.lmsvc.isLivemark(folderId)) {
      // Ignore livemarks -these are constantly added automatically
      // and we don't really care about them.
      switch (type) {
        case this.bmsvc.TYPE_BOOKMARK:
          exports.handlers.record(WeekEventCodes.BOOKMARK_CREATE,
                                  "New Bookmark Added");
        break;
        case this.bmsvc.TYPE_FOLDER:
          exports.handlers.record(WeekEventCodes.BOOKMARK_CREATE,
                                  "New Bookmark Folder");
        break;
      }
    }
  },

  onItemRemoved: function(itemId, parentId, index, type) {
    let isLivemark = this.lmsvc.isLivemark(parentId);
    if (!isLivemark) {
    // Ignore livemarks
      exports.handlers.record(WeekEventCodes.BOOKMARK_MODIFY,
                              "Bookmark Removed");
    }
  },

  onItemChanged: function(bookmarkId, property, isAnnotation,
                          newValue, lastModified, type) {
    // This gets called with almost every add, remove, or visit; it's too
    // much info, so we're not going to track it for now.
    /*let folderId = this.bmsvc.getFolderIdForItem(bookmarkId);
    if (!this.lmsvc.isLivemark(folderId)) {
      exports.handlers.record(WeekEventCodes.BOOKMARK_MODIFY, [BMK_MOD_CHANGED]);
      console.info("Bookmark modified!");
    }*/
  },

  onItemVisited: function(bookmarkId, visitId, time) {
    // This works.
    exports.handlers.record(WeekEventCodes.BOOKMARK_CHOOSE);
  },

  onItemMoved: function(itemId, oldParentId, oldIndex, newParentId,
                        newIndex, type) {
    exports.handlers.record(WeekEventCodes.BOOKMARK_MODIFY,
                            "Bookmark Moved");
  }
};

var IdlenessObserver = {
  /* Uses nsIIdleService, see
   * https://developer.mozilla.org/en/nsIIdleService
   * However, that has two flaws: First, it is OS-wide, not Firefox-specific.
   * Second, it won't trigger if you close your laptop lid before the
   * allotted time is up.  To catch this second case, we use an additional
   * method: self-pinging on a timer.
   */
  alreadyInstalled: false,
  idleService: null,
  lastSelfPing: 0,
  selfPingTimer: null,
  selfPingInterval: 300000, // Five minutes

  install: function() {
    if (!this.alreadyInstalled) {
      console.info("Adding idleness observer.");
      this.idleService = Cc["@mozilla.org/widget/idleservice;1"]
       .getService(Ci.nsIIdleService);
      // addIdleObserver takes seconds, not ms.  600s = 10 minutes.
      this.idleService.addIdleObserver(this, 600);
      this.alreadyInstalled = true;
      // Periodically ping myself to make sure Firefox is still running...
      // if time since last ping is ever too long, it probably means the computer
      // shut down or something
      this.lastSelfPing = Date.now();
      this.selfPingTimer = Components.classes["@mozilla.org/timer;1"]
                           .createInstance(Components.interfaces.nsITimer);
      this.pingSelf();
    }
  },

  uninstall: function() {
    if (this.alreadyInstalled) {
      this.idleService.removeIdleObserver(this, 600);
      this.alreadyInstalled = false;
      if (this.selfPingTimer) {
        this.selfPingTimer.cancel();
      }
    }
  },

  pingSelf: function() {
    // If we miss one or more expected pings, then record idle event.
    let self = this;
    this.selfPingTimer.initWithCallback(function() {
      let now = Date.now();
      let diff = now - self.lastSelfPing;
      if (diff > self.selfPingInterval * 1.1) {
        // TODO we may occasionally see another event recorded between
        // 'estimatedStop' and 'now', in which case it will be in the file
        // before either of them... account for this in processing.
        let estimatedStop = self.lastSelfPing + self.selfPingInterval;
        // backdate my own timestamp:
        exports.handlers.record(WeekEventCodes.BROWSER_INACTIVE,
                                "Self-ping timer", "", "", estimatedStop);
        exports.handlers.record(WeekEventCodes.BROWSER_ACTIVATE,
                                "Self-ping timer");
      }
      self.lastSelfPing = now;
    }, this.selfPingInterval, 1);
  },

  observe: function(subject, topic, data) {
    // Subject is nsIIdleService. Topic is 'idle' or 'back'.  Data is elapsed
    // time in *milliseconds* (not seconds like addIdleObserver).
    if (topic == 'idle') {
      console.info("User has gone idle for " + data + " milliseconds.");
      let idleTime = Date.now() - parseInt(data);
      exports.handlers.record(WeekEventCodes.BROWSER_INACTIVE,
                              "IdleService observer", "", "", idleTime);
      if (this.selfPingTimer) {
        this.selfPingTimer.cancel();
      }
    }
    if (topic == 'back') {
      console.info("User is back! Was idle for " + data + " milliseconds.");
      exports.handlers.record(WeekEventCodes.BROWSER_ACTIVATE,
                              "IdleService observer");
      this.lastSelfPing = Date.now();
      this.pingSelf();
    }
  }
};

var DownloadsObserver = {
  alreadyInstalled: false,
  downloadManager: null,
  obsService: null,

  install: function() {
    if (!this.alreadyInstalled) {
      console.info("Adding downloads observer.");
      this.obsService = Cc["@mozilla.org/observer-service;1"]
                           .getService(Ci.nsIObserverService);
      this.obsService.addObserver(this, "dl-done", false);

      /*this.downloadManager = Cc["@mozilla.org/download-manager;1"]
                   .getService(Ci.nsIDownloadManager);
      this.downloadManager.addListener(this);*/
      this.alreadyInstalled = true;
    }
  },

  uninstall: function() {
    if (this.alreadyInstalled) {
      //this.downloadManager.removeListener(this);
      this.obsService.removeObserver(this, "dl-done", false);
      this.alreadyInstalled = false;
    }
  },

  observe: function (subject, topic, state) {
    if (topic == "dl-done") {
      console.info("A download completed.");
      exports.handlers.record(WeekEventCodes.DOWNLOAD);
    }
  }

  // This is the API for the downloadManager.addListener listener...
  /*onSecurityChange : function(prog, req, state, dl) {
  },
  onProgressChange : function(prog, req, prog2, progMax, tProg, tProgMax, dl) {
  },
  onStateChange : function(prog, req, flags, status, dl) {
  },
  onDownloadStateChange : function(state, dl) {
  }*/
};

var MemoryObserver = {
  /* Uses nsIMemoryReporterManager, see about:memory
   * It retrieves memory information periodically according to the
   * timerInterval.
   */
  alreadyInstalled: false,
  memoryManager: null,
  memoryInfoTimer: null,
  timerInterval: 15 * 60 * 1000, // 15 minutes

  install: function() {
    if (!this.alreadyInstalled) {
      console.info("Adding memory observer.");

      /* Bug 610488 - don't attempt to record memory on Fx4b7 on Linux; it
       * will cause a crash: */
      let version = Cc["@mozilla.org/fuel/application;1"]
                      .getService(Ci.fuelIApplication).version;
      let os = Cc["@mozilla.org/xre/app-info;1"]
                 .getService(Ci.nsIXULRuntime).OS;
      if ((version == "4.0b7" || version == "4.0b7pre") &&
        os.indexOf("Linux") > -1) {
        this.alreadyInstalled = true;
        return;
      }

      this.memoryManager = Cc["@mozilla.org/memory-reporter-manager;1"]
        .getService(Components.interfaces.nsIMemoryReporterManager);

      this.memoryInfoTimer = Components.classes["@mozilla.org/timer;1"]
        .createInstance(Components.interfaces.nsITimer);

      //Get Memory info on startup
      this.getMemoryInfo();
      let self = this;
      this.memoryInfoTimer.initWithCallback(
        function(){self.getMemoryInfo();},
        this.timerInterval,
        this.memoryInfoTimer.TYPE_REPEATING_SLACK);
      this.alreadyInstalled = true;
    }
  },

  uninstall: function() {
    if (this.alreadyInstalled) {
      this.alreadyInstalled = false;
      if (this.memoryInfoTimer) {
        this.memoryInfoTimer.cancel();
      }
    }
  },

  getMemoryInfo: function() {
    // Along with memory stats, also record number of open windows and tabs:
    exports.handlers.recordNumWindowsAndTabs();
    let enumRep = this.memoryManager.enumerateReporters();
    while (enumRep.hasMoreElements()) {
      let mr = enumRep.getNext().QueryInterface(Ci.nsIMemoryReporter);
      exports.handlers.record(WeekEventCodes.MEMORY_USAGE,
                              mr.path, mr.memoryUsed);
    }
  }
};


function WeekLifeStudyWindowObserver(window, globalInstance) {
  WeekLifeStudyWindowObserver.baseConstructor.call(this, window, globalInstance);
}
BaseClasses.extend(WeekLifeStudyWindowObserver,
                   BaseClasses.GenericWindowObserver);
WeekLifeStudyWindowObserver.prototype.install = function() {
//TODO: Check if it is better to add a listener to Restore btn (id:errorTryAgain)
  //Add total restored windows.

  // Watch for tab opens/closes:
  let browser = this.window.getBrowser();
  if (!browser) {
    // Ignore non-browser window opens
    return;
  }
  let container = browser.tabContainer;
  this._listen(container, "TabOpen", function() {
                 exports.handlers.recordNumWindowsAndTabs();
               }, false);
  this._listen(container, "TabClose", function() {
                 // This happens before the tab closes, so adjust by
                 // -1 to get the number after the close:
                 exports.handlers.recordNumWindowsAndTabs(-1);
               }, false);

  // Since a new window opened, record number of windows and tabs
  // INCLUDING the one we just opened:
  let numTabs = 0;
  let numWindows = exports.handlers._windowObservers.length;
  for (let i = 0; i < numWindows; i++) {
    let window = exports.handlers._windowObservers[i].window;
    let browser = window.getBrowser();
    if (browser) {
      numTabs += browser.tabContainer.itemCount;
    }
  }
  numTabs += this.window.getBrowser().tabContainer.itemCount;
  exports.handlers.record( WeekEventCodes.NUM_TABS,
                           (numWindows + 1) + " windows",
                           numTabs + " tabs" );
};

WeekLifeStudyWindowObserver.prototype.uninstall = function() {
  WeekLifeStudyWindowObserver.superClass.uninstall.call(this);
  // A window closed, so record new number of windows and tabs
  // EXCLUDING this one.
  let numTabs = 0;
  let numWindows = exports.handlers._windowObservers.length;
  for (let i = 0; i < numWindows; i++) {
    let window = exports.handlers._windowObservers[i].window;
    if (window != this.window) {
      let browser = window.getBrowser();
      if (browser) {
        numTabs += browser.tabContainer.itemCount;
      }
    }
  }
  exports.handlers.record( WeekEventCodes.NUM_TABS,
                           (numWindows - 1) + " windows",
                           numTabs + " tabs" );
};


function WeekLifeStudyGlobalObserver() {
  WeekLifeStudyGlobalObserver.baseConstructor.call(this,
                                                   WeekLifeStudyWindowObserver);
}
BaseClasses.extend(WeekLifeStudyGlobalObserver,
                   BaseClasses.GenericGlobalObserver);
WeekLifeStudyGlobalObserver.prototype.getPluginInfo = function() {
  // Copied from about:plugins
  let wm = Cc["@mozilla.org/appshell/window-mediator;1"]
                        .getService(Ci.nsIWindowMediator);
  let frontWindow = wm.getMostRecentWindow("navigator:browser");
  let plugins = frontWindow.navigator.plugins;
  let plugInfo = [];
  plugins.refresh(false);
  for (let i = 0; i < plugins.length; i++) {
    let plugin = plugins[i];
    if (plugin) {
      plugInfo.push(plugin);
    }
  }
  return plugInfo;
};

WeekLifeStudyGlobalObserver.prototype.getTotalPlacesNavHistory = function() {
  //Record the number of places in the history
  let historyService = Cc["@mozilla.org/browser/nav-history-service;1"]
    .getService(Ci.nsINavHistoryService);

  let options = historyService.getNewQueryOptions();
  let query = historyService.getNewQuery();
  let result = historyService.executeQuery(query, options);
  let rootNode = result.root;
  rootNode.containerOpen = true;
  let totalPlaces = rootNode.childCount;
  rootNode.containerOpen = false;

  return totalPlaces;
};

WeekLifeStudyGlobalObserver.prototype.getProfileAge = function() {
  //oldest file in the profile directory
  let file = Components.classes["@mozilla.org/file/directory_service;1"].
                  getService(Components.interfaces.nsIProperties).
                  get("ProfD", Components.interfaces.nsIFile);
  let entries = file.directoryEntries;
  let oldestCreationTime = Date.now();

  while(entries.hasMoreElements()) {
    let entry = entries.getNext();
    try{
      entry.QueryInterface(Components.interfaces.nsIFile);
      //nsIFile doesn't have an attribute for file creation time
      if(oldestCreationTime > entry.lastModifiedTime) {
        oldestCreationTime = entry.lastModifiedTime;
      }
    }
    catch(e){
     //If it couldn't access file info
    }
  }
  return oldestCreationTime;
};

WeekLifeStudyGlobalObserver.prototype.recordNumWindowsAndTabs = function(adj) {
  let numTabs = 0;
  if (adj != undefined) {
    // adj is adjustment, it's a hack that lets us subtract 1 on the tab
    // close in order to record what the number is after the close.
    numTabs += adj;
  }
  let numWindows = this._windowObservers.length;
  for (let i = 0; i < numWindows; i++) {
    let window = this._windowObservers[i].window;
    let tabs = window.getBrowser().tabContainer.itemCount;
    numTabs += tabs;
  }
  this.record( WeekEventCodes.NUM_TABS, numWindows + " windows",
               numTabs + " tabs" );
};

WeekLifeStudyGlobalObserver.prototype.recordSessionStorePrefs = function() {
  let prefs = Cc["@mozilla.org/preferences-service;1"]
    .getService(Ci.nsIPrefService);

  let prefBranch = prefs.getBranch("browser.startup.");
  let prefValue = prefBranch.getIntPref("page");
  //browser.startup.page 0: blank page, 1: homepage, 3: previous session
  this.record(WeekEventCodes.SESSION_RESTORE_PREFERENCES,
              "browser.startup.page", prefValue);

  prefBranch = prefs.getBranch("browser.sessionstore.");

  prefValue = prefBranch.getBoolPref("resume_from_crash");
  this.record(WeekEventCodes.SESSION_RESTORE_PREFERENCES,
              "browser.sessionstore.resume_from_crash", prefValue);

  prefValue = prefBranch.getBoolPref("resume_session_once");
  this.record(WeekEventCodes.SESSION_RESTORE_PREFERENCES,
              "browser.sessionstore.resume_session_once", prefValue);

  prefValue = prefBranch.getIntPref("max_resumed_crashes");
  this.record(WeekEventCodes.SESSION_RESTORE_PREFERENCES,
              "browser.sessionstore.max_resumed_crashes", prefValue);
};

WeekLifeStudyGlobalObserver.prototype.startAllObservers = function() {
  BookmarkObserver.install();
  IdlenessObserver.install();
  //DownloadsObserver.install();
  MemoryObserver.install();
};

WeekLifeStudyGlobalObserver.prototype.stopAllObservers = function() {
  BookmarkObserver.uninstall();
  IdlenessObserver.uninstall();
  //DownloadsObserver.uninstall();
  MemoryObserver.uninstall();
};

WeekLifeStudyGlobalObserver.prototype.observe = function(subject, topic, data) {
  if (topic == "quit-application") {
    if (data == "shutdown") {
      this.record(WeekEventCodes.BROWSER_SHUTDOWN);
    } else if (data == "restart") {
      this.record(WeekEventCodes.BROWSER_RESTART);
    }
  }
};

WeekLifeStudyGlobalObserver.prototype.onExperimentStartup = function(store) {
  WeekLifeStudyGlobalObserver.superClass.onExperimentStartup.call(this, store);
  let self = this;
  // Record the version of this study at startup: this lets us see
  // what data was recorded before and after an update, which lets us
  // know whether any given data included a given bug-fix or not.
  this.record(WeekEventCodes.STUDY_STATUS, exports.experimentInfo.versionNumber);

  //Record plugin info
  for each (let plugin in this.getPluginInfo()) {
    console.info("plugin.name: "+ plugin.name);
    this.record(WeekEventCodes.PLUGIN_VERSION, plugin.filename,
                 plugin.version, plugin.name);
  }

  //Record navigation history
  let totalPlaces = this.getTotalPlacesNavHistory();
  console.info("Total History Places: "+ totalPlaces);
  this.record(WeekEventCodes.HISTORY_STATUS, totalPlaces, "", "");

  //Record oldest file in profile
  let profileAge = this.getProfileAge();
  console.info("Profile Age: "+ profileAge + " milliseconds");
  this.record(WeekEventCodes.PROFILE_AGE, profileAge, "", "");

  //Record session store main preferences
  this.recordSessionStorePrefs();

  console.info("Week in the life: Starting subobservers.");
  this.startAllObservers();
  BookmarkObserver.runGlobalBookmarkQuery();

  this.obsService = Cc["@mozilla.org/observer-service;1"]
                         .getService(Ci.nsIObserverService);
  this.obsService.addObserver(this, "quit-application", false);
};

// Utility function for recording events:
WeekLifeStudyGlobalObserver.prototype.record = function(eventCode, val1, val2,
                                                        val3, timestamp) {
  // Make sure string columns are strings
  if (!val1) {
    val1 = "";
  } else if (typeof val1 != "string") {
    val1 = val1.toString();
  }
  if (!val2) {
    val2 = "";
  } else if (typeof val2 != "string") {
    val2 = val2.toString();
  }
  if (!val3) {
    val3 = "";
  } else if (typeof val3 != "string") {
    val3 = val3.toString();
  }
  if (!timestamp) {
    timestamp = Date.now();
  }
  WeekLifeStudyGlobalObserver.superClass.record.call(this,
  {
    event_code: eventCode,
    data1: val1,
    data2: val2,
    data3: val3,
    timestamp: timestamp
  });
};

WeekLifeStudyGlobalObserver.prototype.onAppStartup = function() {
  WeekLifeStudyGlobalObserver.superClass.onAppStartup.call(this);
  // TODO how can we tell if something has gone wrong with session restore?
  this.record(WeekEventCodes.BROWSER_START);
  console.info("Week in the life study got app startup message.");

  //RESTORE SESSION information, number of tabs and windows restored
  let stateObject = null;
  let sessionStartup = Cc["@mozilla.org/browser/sessionstartup;1"]
                  .getService(Ci.nsISessionStartup);
  let sessionData = sessionStartup.state;
  if (sessionData) {
    stateObject = JSON.parse(sessionData);
    let countWindows = 0;
    let countTabs = 0;
    stateObject.windows.forEach(function(aWinData, aIx) {
      countWindows = countWindows + 1;
      let winState = {
        ix: aIx
      };
      winState.tabs = aWinData.tabs.map(function(aTabData) {
        let entry = aTabData.entries[aTabData.index - 1] || { url: "about:blank" };
        return {
          parent: winState
        };
      });

      for each (var tab in winState.tabs){
        countTabs = countTabs + 1;
      }
    }, this);

    console.info("Session Restored: total windows: "+ countWindows
      + " total tabs: " +  countTabs);
    this.record(WeekEventCodes.SESSION_ON_RESTORE, "Windows " + countWindows,
                "Tabs " + countTabs);
  } else {
    this.record(WeekEventCodes.SESSION_ON_RESTORE, "Windows 0", "Tabs 0");
  }

  // If available, record startup time!
  let runtime = Cc["@mozilla.org/xre/runtime;1"].getService(Ci.nsIXULRuntime);
  if (runtime && runtime.launchTimestamp) {
    let launched = runtime.launchTimestamp;
    let startup = runtime.startupTimestamp;
    let startupDuration = startup - launched;
    let app = Cc["@mozilla.org/toolkit/app-startup;1"]
          .getService(Ci.nsIAppStartup2);
    if (app && app.restoredTimestamp) {
      let restored = app.restoredTimestamp;
      let restoreDuration = restored - startup;
      this.record(WeekEventCodes.STARTUP_TIME,
                  "Startup: " + startupDuration,
                  "Restore: " + restoreDuration);
    } else {
      this.record(WeekEventCodes.STARTUP_TIME,
                  "Startup: " + startupDuration);
    }
  } else {
    this.record(WeekEventCodes.STARTUP_TIME, "Unavailable");
  }
};

WeekLifeStudyGlobalObserver.prototype.onExperimentShutdown = function() {

  WeekLifeStudyGlobalObserver.superClass.onExperimentShutdown.call(this);
  console.info("Week in the life: Shutting down subobservers.");
  this.stopAllObservers();
  // This check is to make sure nothing weird will happen if
  // onExperimentShutdown gets called more than once:
  if (this.obsService) {
    this.obsService.removeObserver(this, "quit-application", false);
    this.obsService = null;
  }
};

WeekLifeStudyGlobalObserver.prototype.onEnterPrivateBrowsing = function() {
  // call record first, otherwise it becomes a no-op when we enter PB mode
  this.record(WeekEventCodes.PRIVATE_ON);
  WeekLifeStudyGlobalObserver.superClass.onEnterPrivateBrowsing.call(this);
  this.stopAllObservers();
};

WeekLifeStudyGlobalObserver.prototype.onExitPrivateBrowsing = function() {
  WeekLifeStudyGlobalObserver.superClass.onExitPrivateBrowsing.call(this);
  this.record(WeekEventCodes.PRIVATE_OFF);
  this.startAllObservers();
};

// Instantiate and export the global observer (required!)
exports.handlers = new WeekLifeStudyGlobalObserver();

// Web content
function WeekLifeStudyWebContent()  {
  WeekLifeStudyWebContent.baseConstructor.call(this, exports.experimentInfo);
}
BaseClasses.extend(WeekLifeStudyWebContent, BaseClasses.GenericWebContent);
WeekLifeStudyWebContent.prototype.__defineGetter__("dataViewExplanation",
//TODO when study over, should say "at the end of the week" instead of "now".
  function() {
    return '<h4>Facts About Your Browser Use From <span id="usage-period-start-span"></span>\
    To <span id="usage-period-end-span"></span></h4>\
    <p><b>Bookmarks:</b> At the beginning of the week you had \
    <span id="first-num-bkmks-span"></span>. Now you have \
    <span id="num-bkmks-span"></span> in <span id="num-folders-span"></span>, \
    to a max folder depth of <span id="max-depth-span"></span>.</p>\
    </div>';
  });

WeekLifeStudyWebContent.prototype.__defineGetter__("dataCanvas",
  function() {
      return this.rawDataLink +
      '<div class="dataBox"><div id="graph-div"></div>' +
      this.saveButtons + this.dataViewExplanation +'</div>';
  });

WeekLifeStudyWebContent.prototype.__defineGetter__("saveButtons",
  function() {
    // Flot creates a canvas inside graph-div; that's the one we need.
    let btnCode = "saveCanvas(document.getElementById('graph-div').getElementsByTagName('canvas').item(0))";
    return '<div><button type="button" onclick="' + btnCode + '">\
    Save Graph</button>&nbsp;&nbsp;<button type="button"\
    onclick="exportData();">Export Data</button></div>';
  });


WeekLifeStudyWebContent.prototype.deleteDataOlderThanAWeek = function(store) {
  /* TODO: we're breaking encapsulation here because there's no public
   * method to do this on the data store object... this should be implemented
   * there. */
  let selectSql = "SELECT timestamp FROM " + store._tableName +
    " ORDER BY timestamp DESC LIMIT 1";
  let selectStmt = store._createStatement(selectSql);
  if (selectStmt.executeStep()) {
    let timestamp = selectStmt.row.timestamp;
    let cutoffDate = timestamp - (7 * 24 * 60 * 60 * 1000);
    let wipeSql = "DELETE FROM " + store._tableName +
      " WHERE timestamp < " + cutoffDate;
    let wipeStmt = store._createStatement(wipeSql);
    wipeStmt.execute();
    wipeStmt.finalize();
    console.info("Executed " + wipeSql);
  }
  selectStmt.finalize();
};

WeekLifeStudyWebContent.prototype.onPageLoad = function(experiment,
                                                       document,
                                                       graphUtils) {
  // Get rid of old data so it doesn't pollute current submission
  this.deleteDataOlderThanAWeek(experiment.dataStore);
  experiment.getDataStoreAsJSON(function(rawData) {
    let firstNumBookmarks = null;
    let bkmks = 0;
    let folders = 0;
    let depth = 0;
    let firstTimestamp = 0;
    let maxBkmks = 0;
    let numDownloads = 0;

    let firstNumAddons = null;
    let numAddons = 0;

    // Make graphs of 1. memory and 2. tabs over time
    let memData = [];
    let tabData = [];
    let lastMemData = 0;
    let lastTabData = 0;
    for each ( let row in rawData ) {
      if (firstTimestamp == 0 ) {
        firstTimestamp = row.timestamp;
      }
      switch(row.event_code) {
      case WeekEventCodes.BOOKMARK_STATUS:
        bkmks = parseInt(row.data1.replace("total bookmarks", ""));
        folders = parseInt(row.data2.replace("folders", ""));
        depth = parseInt(row.data3.replace("folder depth", ""));
        if (firstNumBookmarks == null) {
          firstNumBookmarks = bkmks;
        }
      break;
      case WeekEventCodes.BOOKMARK_CREATE:
        switch (row.data1) {
          case "New Bookmark Added":
            bkmks += 1;
          break;
          case "New Bookmark Folder":
            folders += 1;
          break;
        }
      break;
      case WeekEventCodes.BOOKMARK_MODIFY:
        if (row.data1 == "Bookmark Removed") {
          bkmks -= 1;
        }
      break;
      case WeekEventCodes.DOWNLOAD:
        numDownloads += 1;
      break;
      case WeekEventCodes.MEMORY_USAGE:
        if (row.data1.indexOf("mapped") != -1) {
          let numBytes = parseInt(row.data2) / ( 1024 * 1024);
          memData.push([row.timestamp, numBytes]);
          lastMemData = numBytes;
        }
        break;
      case WeekEventCodes.NUM_TABS:
        let numTabs = parseInt(row.data2.replace(" tabs", ""));
        tabData.push([row.timestamp, numTabs]);
        lastTabData = numTabs;
        break;
      case WeekEventCodes.BROWSER_START: case WeekEventCodes.BROWSER_SHUTDOWN:
      case WeekEventCodes.BROWSER_RESTART:
        memData.push([row.timestamp, 0]);
        tabData.push([row.timestamp, 0]);
        lastMemData = 0;
        lastTabData = 0;
      break;
      }
    }

    let lastTimestamp;
    if (rawData.length > 0 && (experiment.status >= 4)) {
      lastTimestamp = rawData[(rawData.length - 1)].timestamp;
    } else {
      lastTimestamp = (new Date()).getTime();
    }

    // TODO x-axis dates are incorrectly converting to GMT somehow.
    /* TODO graph would be more readable if we drew lines between
     * observations points - but NOT lines down to zero-level, they
     * make the graph very busy and hard to read.  Instead, draw
     * disconnected lines. */
    let plotDiv = document.getElementById("graph-div");
    plotDiv.style.height="600px";
    graphUtils.plot(plotDiv, [{label: "Memory Used (MB) (Left Axis)",
                               data: memData,
                               points: {show: true}
                               },
                              {label: "Tabs Open (Right Axis)",
                               data: tabData,
                               color: "rgb(255, 100, 123)",
                               yaxis: 2,
                               points: {show: true}
                              }],
                    {xaxis: {mode: "time", timeformat: "%b %d, %h:%m"},
                     yaxis: {},
                     y2axis: {minTickSize: 1, tickDecimals: 0}}
                  );


    // Fill in missing values from html paragraphs:
    let getHours = function(x) {
      return Math.round( x / 36000 ) / 100;
    };
    let getFormattedDateString = function(timestamp) {
      let date = new Date(timestamp);
      let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug",
                  "Sep", "Oct", "Nov", "Dec"];
      return months[date.getMonth()] + " " + date.getDate() + ", "
        + date.getFullYear();
    };
    let startSpan = document.getElementById("usage-period-start-span");
    let endSpan = document.getElementById("usage-period-end-span");
    if (startSpan) {
      startSpan.innerHTML = getFormattedDateString(firstTimestamp);
    }
    if (endSpan) {
      endSpan.innerHTML = getFormattedDateString(lastTimestamp);
    }
    if (firstNumBookmarks == null) {
      firstNumBookmarks = 0;
    }
    document.getElementById("first-num-bkmks-span").innerHTML =
                                    (firstNumBookmarks == 1)? "one bookmark" :
                                    firstNumBookmarks + " bookmarks";
    document.getElementById("num-bkmks-span").innerHTML =
                                    (bkmks == 1)? "one bookmark" :
                                    bkmks + " bookmarks";
    document.getElementById("num-folders-span").innerHTML =
                                    (folders == 1)? "one folder" :
                                    folders + " folders";
    document.getElementById("max-depth-span").innerHTML = depth;
    /*document.getElementById("num-downloads").innerHTML =
                                    (numDownloads == 1)? "one file" :
                                    numDownloads + " files";*/
  });
};

exports.webContent = new WeekLifeStudyWebContent();

// Cleanup
require("unload").when(
  function myDestructor() {
    console.info("WeekLife study destructor called.");
    exports.handlers.onExperimentShutdown();
  });
