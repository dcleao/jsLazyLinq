jsLinq
=======

This library brings the flavour of .Net's LINQ - [Language Integrated Query](http://msdn.microsoft.com/en-us/netframework/aa904594.aspx) - to JavaScript.

**NOT** that you can start writing with the LINQ's «query comprehension syntax»; as an example, in C# that would be:

var query = (from candidate in candidates
			 where candidate.Age <= 40
			 where candidate.IQ  >= 200
			 select candidate.Name);

**INSTEAD**, this library enables writing something like the C#'s LINQ "lambda syntax":

	var query = candidates.
				 Where (function(candidate){ return candidate.Age <= 40;  }).
				 Where (function(candidate){ return candidate.IQ  >= 200; }).
				 Select(function(candidate){ return candidate.Name; });

Then a query can be used one or more times, as in:

	var names = "";
	query.Do(function(name){
		names += (name + "\n");
	});

Or, arguably better, as in:

	var names = query.ToArray().join("\n");

So what's really new about this? What is it that you can't already do with [jQuery.js](http://github.com/jquery) or [prototype.js](http://github.com/sstephenson/prototype)?

It's just that the evaluation of sequences is **LAZY** and does not materialize results (unless you explicitly convert it to an array).
With the aforementioned frameworks, each step of a query materializes its result, for consumption by the next step, which is quite a waste.
For example, in *prototype*, a similar query could be written as:

	var candidate = candidates.
					findAll(function(candidate){ return candidate.Age <= 40;  }).
					findAll(function(candidate){ return candidate.IQ  >= 200; }).
					map(function(candidate){ return candidate.Name; }).
					first();

Suppose we are only interested in the first candidate satisfying the above conditions.
The first *findAll* filters candidates with an age not greater than 40, and the result is materialized, as an array. 
Then, the second *findAll* is applied to it and its result is materialzed into another array.
Then, *map* gets the name of each candidate, materializing into yet another array.
Finally ... well, we were only interested in the first candidate's name.

*It's really not the right way to do such a query, but unfortunately, it's the way many people __USE__ prototype and jQuery.*

This library offers query operators which are *lazy* by nature.