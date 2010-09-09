esmswall
========

__esmswall__ is a SMS-to-Screen display system built in Erlang using Nitrogen+Riak.

## Dependencies

esmswall comes by default with Nitrogen packaged, but you are required to setup your own Riak cluster.
See [Riak Wiki](http://wiki.basho.com/display/RIAK/Riak) for more information.

__NOTE__ This only works with riak-0.10.1 at the moment.

You also need a way for the application to get the SMS data from the aggregator. The service which I use
to test this out is [Textmarks](http://www.textmarks.com/), and it works well.

##Getting Started

* Start your riak cluster
* Start the esmswall: `$ <install path>/bin/nitrogen start`

* For the moderator interface, browse to: `http://localhost:8000/moderate`

* For the wall itself, browse to: `http://localhost:8000/display`


## Having Issues?

* Make sure your cookies match in the vm.args in both Riak and Nitrogen
* Make sure your Riak cluster has started.
* Check your aggregator to verify it is sending data to: `http://<your external IP>:8000/parse`


## TODO

* __PRIORITY:__ Get it working with riak-0.12
* __PRIORITY:__ Switch to using the Erlang PBC library for communictions.
* More options for the moderators
* Easier to configure
* The ability to bypass moderation
* More control over the display



