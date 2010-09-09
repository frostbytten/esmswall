-module (display).
-compile(export_all).
-include_lib("nitrogen/include/wf.hrl").

main() -> #template { file="./site/templates/bare.html" }.

title() -> "".

body() -> 
	{ok, C} = riak:client_connect('riak@127.0.0.1'),
	Body = [
		#table{style="text-align:center; width: 50%;", rows=[
				#tablerow {
					cells=[#tablecell{id=updateCell}]
				}]}
	],
	wf:comet(fun() -> check_outbox(C) end),
	Body.
	
event(_) -> ok.

check_outbox(C) ->
	timer:sleep(20000),
	{ok, List} = C:list_keys(<<"outbox">>),
	case List of
		[] ->
			%wf:update(updateCell, #p{}),
			%wf:flush();
			ok;
		_->
			[Id|_] = List,
			{ok,Msg} = C:get(<<"outbox">>, Id, 1),
			SmsMsg = [riak_object:get_value(Msg)],
			ok = C:put(riak_object:new(<<"sent">>, Id, SmsMsg),1),
			C:delete(<<"outbox">>, Id, 1),
			wf:update(updateCell, #panel{body=SmsMsg}),
			wf:flush()
	end,
	check_outbox(C).
