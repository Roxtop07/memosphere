// Comprehensive Voice Command Patterns
// This file defines all voice command patterns for the voice assistant

export const VOICE_COMMAND_PATTERNS = [
  // NAVIGATION COMMANDS - Priority 1
  { 
    patterns: [/\b(show|view|open|go to|navigate to)\s+meetings?\b/i, /\bmeetings?\s+(tab|page)\b/i],
    command: "navigate-meetings",
    priority: 1
  },
  { 
    patterns: [/\b(show|view|open|go to|navigate to)\s+events?\b/i, /\bevents?\s+(tab|page)\b/i],
    command: "navigate-events",
    priority: 1
  },
  { 
    patterns: [/\b(show|view|open|go to|navigate to)\s+polic(y|ies)\b/i, /\bpolic(y|ies)\s+(tab|page)\b/i],
    command: "navigate-policies",
    priority: 1
  },
  { 
    patterns: [/\b(show|view|open|go to)\s+(overview|dashboard)\b/i, /\b(main|home)\s+page\b/i],
    command: "navigate-overview",
    priority: 1
  },
  { 
    patterns: [/\b(show|view|open)\s+audit\s+(trail|log)\b/i, /\baudit\s+(tab|page)\b/i],
    command: "navigate-audit",
    priority: 1
  },
  { 
    patterns: [/\b(show|view|open)\s+settings?\b/i, /\bsettings?\s+(tab|page)\b/i],
    command: "navigate-settings",
    priority: 1
  },
  { 
    patterns: [/\b(show|view|open)\s+(my\s+)?profile\b/i, /\bprofile\s+(tab|page)\b/i],
    command: "navigate-profile",
    priority: 1
  },
  { 
    patterns: [/\bgo\s+back\b/i, /\bback\b/i, /\bprevious\s+page\b/i],
    command: "go-back"
  },
  { 
    patterns: [/\bgo\s+home\b/i, /\bhome\s+page\b/i, /\breturn\s+to\s+home\b/i],
    command: "go-home"
  },
  { 
    patterns: [/\bgo\s+forward\b/i, /\bforward\b/i, /\bnext\s+page\b/i],
    command: "go-forward"
  },

  // CREATE/EDIT COMMANDS - Priority 1
  { 
    patterns: [/\b(create|new|add)\s+(a\s+)?meeting\b/i, /\bschedule\s+(a\s+)?meeting\b/i],
    command: "create-meeting",
    priority: 1
  },
  { 
    patterns: [/\b(create|new|add)\s+(an?\s+)?event\b/i],
    command: "create-event",
    priority: 1
  },
  { 
    patterns: [/\b(create|new|add)\s+(a\s+)?polic(y|ies)\b/i],
    command: "create-policy",
    priority: 1
  },
  { 
    patterns: [/\bedit\s+(current|this)?\s*meeting\b/i, /\bmodify\s+meeting\b/i],
    command: "edit-meeting"
  },
  { 
    patterns: [/\bedit\s+(current|this)?\s*event\b/i, /\bmodify\s+event\b/i],
    command: "edit-event"
  },
  { 
    patterns: [/\bedit\s+(current|this)?\s*polic(y|ies)\b/i, /\bmodify\s+polic(y|ies)\b/i],
    command: "edit-policy"
  },
  { 
    patterns: [/\bdelete\s+(current|this)?\s*meeting\b/i, /\bremove\s+meeting\b/i],
    command: "delete-meeting"
  },
  { 
    patterns: [/\bdelete\s+(current|this)?\s*event\b/i, /\bremove\s+event\b/i],
    command: "delete-event"
  },
  { 
    patterns: [/\bdelete\s+(current|this)?\s*polic(y|ies)\b/i, /\bremove\s+polic(y|ies)\b/i],
    command: "delete-policy"
  },
  { 
    patterns: [/\bduplicate\s+(current|this)?\s*meeting\b/i, /\bcopy\s+meeting\b/i],
    command: "duplicate-meeting"
  },
  { 
    patterns: [/\bduplicate\s+(current|this)?\s*event\b/i, /\bcopy\s+event\b/i],
    command: "duplicate-event"
  },

  // MEETING MANAGEMENT COMMANDS
  { 
    patterns: [/\bstart\s+(the\s+)?meeting\b/i, /\bbegin\s+(the\s+)?meeting\b/i],
    command: "start-meeting"
  },
  { 
    patterns: [/\bend\s+(the\s+)?meeting\b/i, /\bfinish\s+(the\s+)?meeting\b/i, /\bclose\s+(the\s+)?meeting\b/i],
    command: "end-meeting"
  },
  { 
    patterns: [/\bjoin\s+(the\s+)?meeting\b/i, /\benter\s+(the\s+)?meeting\b/i],
    command: "join-meeting"
  },
  { 
    patterns: [/\bleave\s+(the\s+)?meeting\b/i, /\bexit\s+(the\s+)?meeting\b/i],
    command: "leave-meeting"
  },
  { 
    patterns: [/\bschedule\s+(a\s+)?meeting\b/i, /\bbook\s+(a\s+)?meeting\b/i],
    command: "schedule-meeting"
  },
  { 
    patterns: [/\breschedule\s+(the\s+)?meeting\b/i, /\bchange\s+meeting\s+time\b/i],
    command: "reschedule-meeting"
  },
  { 
    patterns: [/\bcancel\s+(the\s+)?meeting\b/i],
    command: "cancel-meeting"
  },
  { 
    patterns: [/\bstart\s+recording\b/i, /\brecord\s+meeting\b/i, /\bbegin\s+recording\b/i],
    command: "start-recording"
  },
  { 
    patterns: [/\bstop\s+recording\b/i, /\bend\s+recording\b/i, /\bfinish\s+recording\b/i],
    command: "stop-recording"
  },
  { 
    patterns: [/\bpause\s+recording\b/i],
    command: "pause-recording"
  },
  { 
    patterns: [/\bresume\s+recording\b/i, /\bcontinue\s+recording\b/i],
    command: "resume-recording"
  },
  { 
    patterns: [/\bgenerate\s+agenda\b/i, /\bcreate\s+agenda\b/i, /\bmake\s+agenda\b/i],
    command: "generate-agenda"
  },
  { 
    patterns: [/\bextract\s+decisions?\b/i, /\bfind\s+decisions?\b/i, /\bget\s+decisions?\b/i],
    command: "extract-decisions"
  },
  { 
    patterns: [/\bshare\s+(the\s+)?meeting\b/i, /\bsend\s+meeting\b/i],
    command: "share-meeting"
  },
  { 
    patterns: [/\bexport\s+(the\s+)?meeting\b/i, /\bdownload\s+meeting\b/i],
    command: "export-meeting"
  },
  { 
    patterns: [/\bprint\s+(the\s+)?meeting\b/i],
    command: "print-meeting"
  },

  // EVENT MANAGEMENT COMMANDS
  { 
    patterns: [/\b(rsvp|respond)\s+yes\b/i, /\b(i'm|i am)\s+going\b/i, /\b(i'll|i will)\s+attend\b/i],
    command: "rsvp-yes"
  },
  { 
    patterns: [/\b(rsvp|respond)\s+no\b/i, /\bnot\s+going\b/i, /\bcan'?t\s+attend\b/i, /\bwon'?t\s+attend\b/i],
    command: "rsvp-no"
  },
  { 
    patterns: [/\b(rsvp|respond)\s+maybe\b/i, /\bmaybe\s+attend\b/i, /\btentative\b/i],
    command: "rsvp-maybe"
  },
  { 
    patterns: [/\bshare\s+(the\s+)?event\b/i, /\bsend\s+event\b/i],
    command: "share-event"
  },
  { 
    patterns: [/\bexport\s+(the\s+)?event\b/i, /\bdownload\s+event\b/i],
    command: "export-event"
  },
  { 
    patterns: [/\bprint\s+(the\s+)?event\b/i],
    command: "print-event"
  },
  { 
    patterns: [/\bcancel\s+(the\s+)?event\b/i],
    command: "cancel-event"
  },
  { 
    patterns: [/\bremind\s+me\s+(about\s+)?(the\s+)?event\b/i, /\bset\s+event\s+reminder\b/i],
    command: "remind-event"
  },

  // POLICY MANAGEMENT COMMANDS
  { 
    patterns: [/\bencrypt\s+(the\s+)?polic(y|ies)\b/i, /\block\s+polic(y|ies)\b/i, /\bsecure\s+polic(y|ies)\b/i],
    command: "encrypt-policy"
  },
  { 
    patterns: [/\bdecrypt\s+(the\s+)?polic(y|ies)\b/i, /\bunlock\s+polic(y|ies)\b/i],
    command: "decrypt-policy"
  },
  { 
    patterns: [/\bshare\s+(the\s+)?polic(y|ies)\b/i, /\bsend\s+polic(y|ies)\b/i],
    command: "share-policy"
  },
  { 
    patterns: [/\bexport\s+(the\s+)?polic(y|ies)\b/i, /\bdownload\s+polic(y|ies)\b/i],
    command: "export-policy"
  },
  { 
    patterns: [/\bprint\s+(the\s+)?polic(y|ies)\b/i],
    command: "print-policy"
  },
  { 
    patterns: [/\barchive\s+(the\s+)?polic(y|ies)\b/i],
    command: "archive-policy"
  },
  { 
    patterns: [/\brestore\s+(the\s+)?polic(y|ies)\b/i, /\bunarchive\s+polic(y|ies)\b/i],
    command: "restore-policy"
  },

  // UI CONTROL COMMANDS
  { 
    patterns: [/\btoggle\s+theme\b/i, /\bswitch\s+theme\b/i, /\b(dark|light)\s+mode\b/i, /\bchange\s+theme\b/i],
    command: "toggle-theme"
  },
  { 
    patterns: [/\btoggle\s+sidebar\b/i, /\b(show|hide)\s+sidebar\b/i],
    command: "toggle-sidebar"
  },
  { 
    patterns: [/\btoggle\s+fullscreen\b/i, /\b(enter|exit)\s+fullscreen\b/i, /\bfullscreen\b/i],
    command: "toggle-fullscreen"
  },
  { 
    patterns: [/\b(open|show|view)\s+notifications?\b/i],
    command: "open-notifications"
  },
  { 
    patterns: [/\b(close|hide)\s+notifications?\b/i],
    command: "close-notifications"
  },
  { 
    patterns: [/\bclear\s+(all\s+)?notifications?\b/i, /\bdelete\s+(all\s+)?notifications?\b/i],
    command: "clear-notifications"
  },
  { 
    patterns: [/\bmark\s+all\s+(as\s+)?read\b/i, /\bread\s+all\b/i],
    command: "mark-all-read"
  },
  { 
    patterns: [/\bscroll\s+up\b/i, /\bgo\s+up\b/i],
    command: "scroll-up"
  },
  { 
    patterns: [/\bscroll\s+down\b/i, /\bgo\s+down\b/i],
    command: "scroll-down"
  },
  { 
    patterns: [/\bscroll\s+to\s+top\b/i, /\btop\s+of\s+page\b/i],
    command: "scroll-top"
  },
  { 
    patterns: [/\bscroll\s+to\s+bottom\b/i, /\bbottom\s+of\s+page\b/i],
    command: "scroll-bottom"
  },
  { 
    patterns: [/\bzoom\s+in\b/i, /\bincrease\s+size\b/i, /\bmake\s+bigger\b/i],
    command: "zoom-in"
  },
  { 
    patterns: [/\bzoom\s+out\b/i, /\bdecrease\s+size\b/i, /\bmake\s+smaller\b/i],
    command: "zoom-out"
  },
  { 
    patterns: [/\bzoom\s+reset\b/i, /\breset\s+zoom\b/i, /\bnormal\s+size\b/i],
    command: "zoom-reset"
  },
  { 
    patterns: [/\brefresh\b/i, /\breload\b/i, /\bupdate\s+page\b/i],
    command: "refresh"
  },

  // SEARCH & FILTER COMMANDS
  { 
    patterns: [/\bsearch\b(?!\s+(meetings?|events?|polic))/i, /\bfind\b/i, /\blook\s+for\b/i],
    command: "search"
  },
  { 
    patterns: [/\bsearch\s+meetings?\b/i, /\bfind\s+meetings?\b/i],
    command: "search-meetings"
  },
  { 
    patterns: [/\bsearch\s+events?\b/i, /\bfind\s+events?\b/i],
    command: "search-events"
  },
  { 
    patterns: [/\bsearch\s+polic(y|ies)\b/i, /\bfind\s+polic(y|ies)\b/i],
    command: "search-policies"
  },
  { 
    patterns: [/\b(filter|show)\s+today\b/i, /\btoday'?s\s+(items|meetings|events)\b/i],
    command: "filter-today"
  },
  { 
    patterns: [/\b(filter|show)\s+(this\s+)?week\b/i, /\bthis\s+week'?s\s+(items|meetings|events)\b/i],
    command: "filter-week"
  },
  { 
    patterns: [/\b(filter|show)\s+(this\s+)?month\b/i, /\bthis\s+month'?s\s+(items|meetings|events)\b/i],
    command: "filter-month"
  },
  { 
    patterns: [/\b(filter|show)\s+all\b/i, /\bshow\s+everything\b/i],
    command: "filter-all"
  },
  { 
    patterns: [/\bclear\s+search\b/i, /\breset\s+search\b/i],
    command: "clear-search"
  },
  { 
    patterns: [/\bclear\s+(all\s+)?filters?\b/i, /\breset\s+filters?\b/i],
    command: "clear-filters"
  },

  // SORT COMMANDS
  { 
    patterns: [/\bsort\s+by\s+date\b/i, /\bsort\s+date\b/i],
    command: "sort-date"
  },
  { 
    patterns: [/\bsort\s+by\s+name\b/i, /\bsort\s+name\b/i, /\bsort\s+alphabetically\b/i],
    command: "sort-name"
  },
  { 
    patterns: [/\bsort\s+by\s+priority\b/i, /\bsort\s+priority\b/i],
    command: "sort-priority"
  },
  { 
    patterns: [/\bsort\s+by\s+status\b/i, /\bsort\s+status\b/i],
    command: "sort-status"
  },
  { 
    patterns: [/\bsort\s+ascending\b/i, /\bascending\s+order\b/i],
    command: "sort-ascending"
  },
  { 
    patterns: [/\bsort\s+descending\b/i, /\bdescending\s+order\b/i],
    command: "sort-descending"
  },

  // VIEW COMMANDS
  { 
    patterns: [/\b(view|show)\s+list\b/i, /\blist\s+view\b/i],
    command: "view-list"
  },
  { 
    patterns: [/\b(view|show)\s+grid\b/i, /\bgrid\s+view\b/i],
    command: "view-grid"
  },
  { 
    patterns: [/\b(view|show)\s+calendar\b/i, /\bcalendar\s+view\b/i],
    command: "view-calendar"
  },
  { 
    patterns: [/\b(view|show)\s+timeline\b/i, /\btimeline\s+view\b/i],
    command: "view-timeline"
  },
  { 
    patterns: [/\b(view|show)\s+kanban\b/i, /\bkanban\s+view\b/i],
    command: "view-kanban"
  },
  { 
    patterns: [/\bshow\s+completed\b/i, /\bdisplay\s+completed\b/i],
    command: "show-completed"
  },
  { 
    patterns: [/\bhide\s+completed\b/i],
    command: "hide-completed"
  },
  { 
    patterns: [/\bshow\s+archived\b/i, /\bdisplay\s+archived\b/i],
    command: "show-archived"
  },
  { 
    patterns: [/\bhide\s+archived\b/i],
    command: "hide-archived"
  },

  // AI COMMANDS
  { 
    patterns: [/\bsummarize\b(?!\s+(meeting|event))/i, /\bcreate\s+summary\b/i, /\bgive\s+me\s+a\s+summary\b/i],
    command: "summarize"
  },
  { 
    patterns: [/\bsummarize\s+(the\s+)?meeting\b/i],
    command: "summarize-meeting"
  },
  { 
    patterns: [/\bsummarize\s+(the\s+)?event\b/i],
    command: "summarize-event"
  },
  { 
    patterns: [/\banalyze\b(?!\s+(meeting|transcript))/i, /\banalysis\b/i, /\bexamine\b/i],
    command: "analyze"
  },
  { 
    patterns: [/\banalyze\s+(the\s+)?transcript\b/i, /\bexamine\s+transcript\b/i],
    command: "analyze-transcript"
  },
  { 
    patterns: [/\btranslate\b/i, /\bconvert\s+language\b/i],
    command: "translate"
  },
  { 
    patterns: [/\bgenerate\s+report\b/i, /\bcreate\s+report\b/i],
    command: "generate-report"
  },
  { 
    patterns: [/\bgenerate\s+summary\b/i, /\bcreate\s+summary\b/i],
    command: "generate-summary"
  },
  { 
    patterns: [/\bextract\s+tasks?\b/i, /\bfind\s+tasks?\b/i, /\bget\s+tasks?\b/i],
    command: "extract-tasks"
  },
  { 
    patterns: [/\bextract\s+action\s+items?\b/i, /\bfind\s+action\s+items?\b/i],
    command: "extract-action-items"
  },
  { 
    patterns: [/\bsuggest\s+improvements?\b/i, /\brecommendations?\b/i],
    command: "suggest-improvements"
  },

  // SYSTEM COMMANDS
  { 
    patterns: [/\bhelp\b/i, /\bwhat\s+can\s+you\s+do\b/i, /\bshow\s+commands?\b/i, /\bcommand\s+list\b/i],
    command: "help"
  },
  { 
    patterns: [/\bshow\s+shortcuts?\b/i, /\bkeyboard\s+shortcuts?\b/i],
    command: "show-shortcuts"
  },
  { 
    patterns: [/\bsave\b(?!\s+as)/i, /\bsave\s+(this|current|the)\b/i],
    command: "save"
  },
  { 
    patterns: [/\bsave\s+as\b/i],
    command: "save-as"
  },
  { 
    patterns: [/\bundo\b/i, /\brevert\b/i],
    command: "undo"
  },
  { 
    patterns: [/\bredo\b/i],
    command: "redo"
  },
  { 
    patterns: [/\bcopy\b/i, /\bcopy\s+(this|that)\b/i],
    command: "copy"
  },
  { 
    patterns: [/\bpaste\b/i],
    command: "paste"
  },
  { 
    patterns: [/\bcut\b/i],
    command: "cut"
  },
  { 
    patterns: [/\bselect\s+all\b/i],
    command: "select-all"
  },
  { 
    patterns: [/\b(log\s*out|sign\s*out)\b/i, /\bexit\s+account\b/i],
    command: "logout"
  },
  { 
    patterns: [/\block\s+screen\b/i, /\bscreen\s+lock\b/i],
    command: "lock-screen"
  },

  // QUICK ACTIONS
  { 
    patterns: [/\bnext\b/i, /\bgo\s+to\s+next\b/i],
    command: "next"
  },
  { 
    patterns: [/\bprevious\b/i, /\bgo\s+to\s+previous\b/i, /\bprev\b/i],
    command: "previous"
  },
  { 
    patterns: [/\bfirst\b/i, /\bgo\s+to\s+first\b/i],
    command: "first"
  },
  { 
    patterns: [/\blast\b/i, /\bgo\s+to\s+last\b/i],
    command: "last"
  },
  { 
    patterns: [/\btoday\b/i, /\bshow\s+today\b/i],
    command: "today"
  },
  { 
    patterns: [/\btomorrow\b/i, /\bshow\s+tomorrow\b/i],
    command: "tomorrow"
  },
  { 
    patterns: [/\byesterday\b/i, /\bshow\s+yesterday\b/i],
    command: "yesterday"
  },
  { 
    patterns: [/\bthis\s+week\b/i, /\bshow\s+this\s+week\b/i],
    command: "this-week"
  },
  { 
    patterns: [/\bnext\s+week\b/i, /\bshow\s+next\s+week\b/i],
    command: "next-week"
  },
  { 
    patterns: [/\blast\s+week\b/i, /\bshow\s+last\s+week\b/i, /\bprevious\s+week\b/i],
    command: "last-week"
  },
];
