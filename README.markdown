jsLazyLinq
==========

This library brings the flavour of .Net's LINQ - [Language Integrated Query](http://msdn.microsoft.com/en-us/netframework/aa904594.aspx) - to JavaScript.

What it can do
--------------

It's **NOT** that you can start writing with the LINQ's *query comprehension syntax*; as an example, in C# that would be:

	 var query = (from candidate in candidates
				  where candidate.Age <= 40
				  where candidate.IQ  >= 200
				  select candidate.Name);

**INSTEAD**, this library enables writing something like the C#'s LINQ *lambda syntax*:

	var query = candidates.
				 where (function(candidate){ return candidate.Age <= 40;  }).
				 where (function(candidate){ return candidate.IQ  >= 200; }).
				 select(function(candidate){ return candidate.Name; });

Then a query can be used one or more times, as in:

	var names = "";
	query.do(function(name){
		names += (name + "\n");
	});

Or, arguably better, as in:

	var names = query.toArray().join("\n");

So what's really new about this? What is it that you can't already do with [jQuery.js](http://github.com/jquery) or [prototype.js](http://github.com/sstephenson/prototype)?

It's just that the evaluation of sequences is **LAZY** and does not materialize results (unless you explicitly convert it to an array).
With the aforementioned frameworks, each step of a query materializes its result, for consumption by the next step, which is quite a waste.
For example, in [prototype.js](http://github.com/sstephenson/prototype), a similar query could be written as:

	var candidate = candidates.
					findAll(function(candidate){ return candidate.Age <= 40;  }).
					findAll(function(candidate){ return candidate.IQ  >= 200; }).
					map(function(candidate){ return candidate.Name; }).
					first();

Suppose we are only interested in the first candidate satisfying the above conditions.
The first `findAll` filters candidates with an age not greater than 40, and the result is materialized, as an array. 
Then, the second `findAll` is applied to it and its result is materialzed into another array.
Then, `map` gets the name of each candidate, materializing into yet another array.
Finally ... well, we were really only interested in the first candidate's name.

*It's really not the right way to do such a query, but unfortunately, it's the way many people __USE__ prototype and jQuery.*

Even other available so called LINQ JavaScript libraries materialize intermediate results, totally missing the spirit of LINQ and .Net enumerables.

This library offers query operators which are *lazy* by nature.

Integration
------------
This library *can* be used standalone, being able to enumerate and query any array or *array-like* JavaScript object — any object with a numeric-valued `length` property, like the DOM `NodeList` (some other well-known objects with a `length` property are explicitly excluded).

If you use [prototype.js](http://github.com/sstephenson/prototype), an integration file is already supplied, enabling transparent enumeration and querying of any *prototype* `Enumerable` object.

The integration mechanism was thought to be as simple as possible — integrating with other libraries should be easy to accomplish.

Design Goals
------------
* Lazy nature - using the Query design pattern
* Emphasis on primitives
* Bringing .Net flavour to JavaScript
* Supporting both Pascal and Camel case for public members
* Keeping .Net LINQ's naming and method signatures whenever applicable
* Being JavaScript framework independent - being usable standalone
* Easy integration with other JavaScript frameworks
* Debuggability - no anonymous functions everywhere - methods likely to be debugged have names
* High unit tests coverage
* Clean & clear code