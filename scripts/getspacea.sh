#! /bin/bash
#set -x

# Configuration Variables
USER_AGENT=""
DOWNLOADS_DIR="${HOME}/Downloads/spacea"
### If set to something other than 0, delays X minutes between cURLS
MIN_DELAY=0
MAX_DELAY=0 

boldecho() {
	if which tput &> /dev/null; then
		echo -e "$(tput smso)$@$(tput rmso)" 1>&2
		#echo "$(tput smso)"
		#echo "$@" 1>&2
		#echo "$(tput rmso)"
	else
		echo "$@" 1>&2
	fi
}

# Helper functions
mildate() {
	# date will gracefully default to using system tz if not provided
	local D=$(TZ=$1 date +%d%b%Y)
	echo "${D^^}"	
}

delay() {
	if [[ "$MAX_DELAY" == 0 ]]; then
		return
	fi
	local MIN=$((MIN_DELAY+1)) # modulo would be exclusive of the actual MIN_DELAY
	local DELAY=$((RANDOM % (MAX_DELAY - MIN_DELAY + 1) + MIN_DELAY))
	echo "Delaying $DELAY minutes before next download" 1>&2
	sleep $((60 * DELAY))
}

distcheck() {
	# Shamelessly pulled from:
	# https://unix.stackexchange.com/questions/46081/identifying-the-system-package-manager
	declare -A osInfo;
	osInfo[/etc/fedora-release]=dnf
	osInfo[/etc/redhat-release]=yum
	osInfo[/etc/arch-release]=pacman
	osInfo[/etc/gentoo-release]=emerge
	osInfo[/etc/SuSE-release]=zypp
	osInfo[/etc/debian_version]=apt-get
	osInfo[/etc/alpine-release]=apk

	for f in ${!osInfo[@]}
	do
	    if [[ -f $f ]];then
		echo Package manager: ${osInfo[$f]}
		PACKAGEMANAGER="${osInfo[$f]}"
		break
	    fi
	done
}

# This program requires whiptail
if ! /bin/which whiptail &> /dev/null; then
	read -p "This script requires the package \"whiptail\". Install?" ANSWER
	if [[ "${ANSWER^^}" != "Y" ]]; then
		exit 1
	fi
	# Install whiptail according to some default package managers
	SUDOMSG="Installing whiptail with sudo"
	distcheck
	if [ -z "$PACKAGEMANAGER" ]; then
		echo "Failed to identify packagemanager; you'll need to install whiptail yourself!" 1>&2
		exit 1
	fi
	# Now, install with the appropriate package manager
	$PACKAGEMANAGER install -y whiptail
	if [[ "$?" != 0 ]]; then
		echo "Installation failed; please manually install whiptail and re-run this script" 1>&2
		exit 1
	fi
fi


# Statically define names here
declare -A AMCNAMES SCHEDULES ROLLCALLS
AMCNAMES[JBPHH]="PACOM-Terminals/Joint-Base-Pearl-Harbor-Hickam-Passenger-Terminal"
AMCNAMES[JBA]="CONUS-Terminals/Joint-Base-Andrews-Passenger-Terminal"

#URLS=( "${!AMCNAMES[@]}" ) # Somehow, that expansion is for assoc array keys

# If no bases are there on the command line; have the user select them now
# Construct the checklist args
whipargs=""
for N in "${!AMCNAMES[@]}"; do
	displayname="${AMCNAMES[$N]#*\/}" # Severs the part before the first /
	whipargs="$whipargs $N $displayname 0"
done


# All AMC bases have the same format for their URLS; only requiring a name
getamcurls() {
	# Accepts, as an argument, the key to a URL in AMCURLS
	local url="${AMCNAMES[$1]}"
	if [[ -z "$url" ]]; then
		echo "Failed to read $1 out of AMCNAMES" 1>&2
		exit 1
	fi
	# If debugging is needed wrt regexes, it may help to add "| tee debug.html"
	local index=$($WGET -nv -O - "https://www.amc.af.mil/AMC-Travel-Site/Terminals/$url/" )
	if [[ "$?" != "0" ]]; then
		echo "Failed to get AMC Portal page for JBPHH" 1>&2
		return
	fi
	# Complicated; but extract the two URLS here via lookbehind/aheads and scrub the domain to be www.amc.af.mil
	# This regex will only get more complicated as I try to cover more variations between bases
	RES=$(echo "$index" | grep -oP '(?<=href=")[^"]+(?=72(\%20)?H(OU)?R)[^"]+|(?<=href=")[^"]+(?=ROLL( |_)?CALL|Utilization)[^"]+' | sed 's/https\:\/\/.*.mil\//\//g;s/^/www.amc.af.mil/g')
	schedule="$(echo "$RES" | grep -E '72H(OU)?R')"
	rollcall="$(echo "$RES" | grep -E 'ROLL( |_)?CALL|Utilization')"
	if [[ -z "$schedule" || -z "$rollcall" ]]; then
		echo "Failed to parse URLs for $1: $schedule ||| $rollcall" 1>&2
		return 1
	else
		echo "Acquired URLs for $1" 1>&2
		SCHEDULES[$1]=$schedule
		ROLLCALLS[$1]=$rollcall
	fi
}

getchoices() {
	# sed required bc something about the redirection adds quotes to the literal string 
	CHOICES=$(whiptail --notags --title "Select Bases" --checklist "Select AMC Terminals to Get" 0 0 0 $whipargs 3>&2 2>&1 1>&3 | sed 's/"//g')
	if [[ -z $CHOICES ]]; then
		echo "No bases selected to scrape." 1>&2
		exit 1
	fi
}

# MAIN FUNCTIONALITY


# TODO: Parse manual args and only run getchoices if none are provided
USAGE=$(echo -e "$0 [-o dir] [-m min_delay_min] [-M max_delay] [base name...]\n\nKnown Base Names: ${!AMCNAMES[@]}")
while getopts "o:u:m:M:h" flag; do
	case $flag in 
		o)
			DOWNLOADS_DIR=$OPTARG
			;;
		u)
			USER_AGENT=$OPTARG
			;;
		m)
			MIN_DELAY=$OPTARG
			;;
		M)
			MAX_DELAY=$OPTARG
			;;
		h)
			echo "$USAGE" 1>&2
			exit 0
			;;
	esac
done

# Process positional args
shift $((OPTIND - 1))
while [[ "$1" != "" ]]; do
	if [[ "$1" =~ [A-Z]+ ]]; then
		# This is a base key
		if [[ -n "${AMCNAMES[$1]}" ]]; then
			CHOICES="$CHOICES $1"
			shift 1
		else
			echo "Error: $1 is not a valid base name" 1>&2
			echo $USAGE 1>&2
			exit 1
		fi
	else
		shift 1
	fi
done

# Now, get choices if needed
if [[ -z "$CHOICES" ]]; then
	getchoices
fi

		
# Quick check for the downloads dir before we do work
if [[ ! -d $DOWNLOADS_DIR ]]; then
	if whiptail --title "Download directory non-existent" --yesno "Destination directory \"$DOWNLOADS_DIR\" does not exist. Create?" 0 0; then
		mkdir -p $DOWNLOADS_DIR || exit 1
	else
		echo "Aborting; directory $DOWNLOADS_DIR does not exist" 1>&2
		exit 1
	fi
fi

if [[ -n "$USER_AGENT" ]]; then
	WGET="wget -U $USER_AGENT"
else
	echo "Using default wget user agent" 1>&2
	WGET="wget"
fi
# Do wgets from within the downloads directory
cd $DOWNLOADS_DIR

echo "Starting scraper..."
delay

# Process AMC URLs
total=0
# TODO: Replace with whiptail progress bar ("gauge")
for choice in $CHOICES; do
	getamcurls $choice
	if [[ "$?" != 0 ]]; then
		echo "Skipping $choice" 1>&2
		continue
	fi
	mkdir -p $choice
	# -f fails silently (no writing the 4XX html to file)
	sname="$choice/$(mildate)_schedule.pdf"
	rname="$choice/$(mildate)_rollcall.pdf"
	#curl -A "$USER_AGENT" -fo "$FNAME" "$URL"
	# -nv is "no-verbose"; still prints errors
	echo -e "$choice:\n\tSchedule URL: ${SCHEDULES[$choice]}\n\tRollcall URL: ${ROLLCALLS[$choice]}"
	$WGET -nv -O "$sname" "${SCHEDULES[$choice]}"
	if [[ -f $sname ]]; then
		boldecho "Schedule - OK -> $sname"
	else
		boldecho "Rollcall - FAIL" 1>&2
	fi
	$WGET -nv -O "$rname" "${ROLLCALLS[$choice]}"
	if [[ -f $rname ]]; then
		boldecho "Rollcall - OK -> $rname"
	else
		boldecho "Rollcall - FAIL" 1>&2
	fi
	((total++))
	# Execute the delay after all but the final pull
	if [[ "$total" != "${#SCHEDULES[@]}" ]]; then
		delay
	fi
done
