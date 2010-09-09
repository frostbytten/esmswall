-module (parse).
-compile(export_all).
-include_lib("nitrogen/include/wf.hrl").

main() -> #template { file="./site/templates/bare.html" }.

title() -> " ".

layout() ->
    #container_12 { body=[
        #grid_8 { alpha=true, prefix=2, suffix=2, omega=true, body=body() }
    ]}.

body() ->
	{ok, C} = riak:client_connect('riak@127.0.0.1'),
	Phone 	= wf:q(num),
	Text 	= wf:q(msg),
	Ts		= date_util:epoch(),
	wf:comet_global(fun() -> moderate:inbox_comet_loop(C) end, inbox),
	case Phone of
		undefined ->
			"Are you trying to access this directly? Please text the keyword to 41411";
		_ ->
			case Text of
				undefined ->
					"You need to send a message following the keyword. Please try again.";
				_ ->
					PNum = list_to_integer(Phone),
					Id = list_to_binary("id"++integer_to_list(Ts+PNum)),
					Msg = riak_object:new(<<"inbox">>, Id, Text),
					C:put(Msg, 1),
					wf:send_global(inbox, {incoming, Id, Text}),
					"Thank you for your message. It should display shortly."
			end
	end.
