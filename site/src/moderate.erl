-module (moderate).
-compile(export_all).
-include_lib("nitrogen/include/wf.hrl").

main() -> #template { file="./site/templates/bones.html" }.

title() -> "Moderate Me!".

layout() ->
    #container_12 { body=[
        #grid_8 { alpha=true, prefix=2, suffix=2, omega=true, body=body() }
    ]}.

body() ->
	{ok, C} = riak:client_connect('riak@127.0.0.1'),
	Body = [
		#h2{text="Incoming Messages"},
		#button{id=test, text="Reload Inbox", postback={reloadInbox, C}},
		#panel{id=inbox}
	],
	wf:comet_global(fun() -> inbox_comet_loop(C) end, inbox),
	Body.

event({reloadInbox, C}) -> 
	Terms = reload_inbox(C),
	wf:update(inbox, Terms),
	wf:flush();
event({accept, Id, C}) ->
	BinId = list_to_binary(Id),
	{ok, Msg} = C:get(<<"inbox">>, BinId, 1),
	ok = C:put(riak_object:new(<<"outbox">>, BinId, [riak_object:get_value(Msg)]), 1),
	ok = C:delete(<<"inbox">>, BinId, 1),
	clear_entry(Id);
event({deny, Id, C}) ->
	BinId = list_to_binary(Id),
	{ok, Msg} = C:get(<<"inbox">>, BinId, 1),
	ok = C:put(riak_object:new(<<"trash">>, BinId, [riak_object:get_value(Msg)]), 1),
	ok = C:delete(<<"inbox">>, BinId, 1),
	clear_entry(Id);
event(_) -> ok.

clear_entry(Id) ->
	wf:remove(list_to_atom("break"++Id)),
	wf:remove(list_to_atom("br"++Id)),
	wf:remove(list_to_atom("mesg"++Id)),
	wf:remove(list_to_atom("send"++Id)),
	wf:remove(list_to_atom("deny"++Id)),
	wf:remove(list_to_atom("line"++Id)),
	wf:flush().

reload_inbox(C) ->
	{ok, List} = C:mapred_bucket(<<"inbox">>, [riak_kv_mapreduce:map_identity(true)]),
	InitialInbox = lists:foldl(fun(X, O) -> K = riak_object:key(X), V = riak_object:get_value(X), generate_msg_handler(binary_to_list(K), V, C)++O end, "", List),
	InitialInbox.
	%ok.

inbox_comet_loop(C) ->
	receive
		'INIT' ->
			% Parse through the inbox and check to see if there is anything new.
			Terms = reload_inbox(C),
			wf:insert_bottom(inbox, Terms),
			wf:flush();
		{incoming, InboxId, InboxMessage} ->
			Terms = generate_msg_handler(binary_to_list(InboxId), InboxMessage, C),
			wf:insert_bottom(inbox, Terms),
			wf:flush();
		_ ->
			ok
	end,
	inbox_comet_loop(C).

generate_msg_handler(Id, Message, C) ->
	Term = [
		#p{id="break"++Id},
		#span{id=list_to_atom("mesg"++Id), text=Message},
		#br{id="br"++Id},
		#button{id=list_to_atom("send"++Id), text="Approve", style="width: 100px; margin-right:25px;", postback={accept, Id, C}},
		#button{id=list_to_atom("deny"++Id), text="Deny", style="width: 100px;", postback={deny, Id, C}},
		#hr{id=list_to_atom("line"++Id)}
	],
	Term.
