#!/bin/bash

# Fail out on error when starting the container
set -e

readonly numargs=$#
args="${@}"
interactive="-i"
if [ $numargs -lt 1 ]; then
   args="/bin/bash"
   interactive="-it"
fi
readonly containerName="bctbuilder-$(date "+%H%M%S%N")"
readonly builder=node:latest

# Disable ctrl-z so users cannot stop abruptly
# trap ctrl-c to stop the container
trap "" SIGTSTP
trap user_exit INT
trap user_exit SIGINT

function user_exit() {
   echo "Stoping container $containerName"
   docker stop -t 0 $containerName
   exit 0
}

docker run -i -d --rm \
   --workdir=$PWD \
   --name $containerName \
   -v $PWD:$PWD \
   $builder

# Don't exit on error here - the container needs to be stopped regardless
#   of the result of executing the commands
set +e

docker exec --user $(id -u) ${interactive} $containerName sh -c "$args"
result=$?

docker stop -t 0 $containerName

exit ${result}
