#! /bin/bash

# pdftotext-based parser functions for bases listed in getspacea.sh

# check dep
if ! which pdftotext &> /dev/null; then
	echo "pdftotext required for this tool to work!" 1>&2
	exit 1
fi

USAGE="$0 [pdfile] [basename] [schedule|rollcall] (outfile)\nIf no outfile provided, prints to stdout"

INFILE=$1
BASE=$2
TYPE=$3
OUTFILE=$4

if [[ -z "$BASE" || -z "$TYPE" || -z "$INFILE" ]]; then
	echo -e $USAGE 1>&2
	exit 1
elif [[ ! -f "$INFILE" ]]; then
	echo "Input file \"$INFILE\" does not exist" 1>&2
	exit 1
fi

notimpl() {
	echo "$1 does not have a $2parser implemented yet" 1>&2
	exit 1
}

JBPHH() {
	case $TYPE in
		schedule)
			# pdftotext does really well with this pdf type; we can just pipe it to awk
			# awk ref: https://bl831.als.lbl.gov/~gmeigs/scripting_help/awk_cheat_sheet.pdf
			# help for getting ranges of columns: https://linuxtect.com/how-to-print-range-of-columns-using-awk-command/
			CSV=$(pdftotext -layout "$INFILE" - | awk '$1~/(MOND|TUES|WEDS|THURS|FRID|SATU|SUND)/ {HDATE=$2$3$4}; $0~/(^ +[0-9]{4})/ { { LOC="\""$2; for(i=3;i<NF;i++) LOC=LOC" "$i }; {LOC=LOC"\""; printf("%s,%s,%s,%s\n",HDATE, $1, LOC, $NF)} }' )
			;;
		rollcall)
			notimpl $BASE "$TYPE "
			;;
		*)
			echo "Invalid Base Type (\"$TYPE\")" 1>&2
			exit 1
			;;
	esac

}

# Execute the function that matches
if ! declare -F "$BASE" &> /dev/null; then
	# function does not exist
	notimpl $BASE ""
fi
	
# Parser functions will store the result in $CSV
eval "$BASE"

# Check if we had an error
if [[ -z "$CSV" ]]; then
	echo "Parser for ${TYPE}s failed for base $BASE" 1>&2
	exit 1
fi

if [[ -z "$OUTFILE" ]]; then
	echo "$CSV"
else
	echo "$CSV" > $OUTFILE
fi
