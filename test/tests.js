
function getTest(){
	var undefined;
	
	function test(name, fun){
		testDef["test_" + name] = fun;
	}
	
	var testDef = {
		setup: function() {
			
		},
		
		teardown: function() {
			
		}
	};
	
	
	test("'Query' is exported to global scope", function(){
		with(this) {
			assert(typeof Query === 'function');
		}
	});
	
	test("'$Q' is exported to global scope", function(){
		with(this) {
			assert(typeof $Q === 'function');
		}
	});
	
	test("'$Q' is the same as 'Query.Create'", function(){
		with(this) {
			assert($Q === Query.Create);
		}
	});
	
	test("'$Q' can handle null things returning null", function(){
		with(this) {
			assert($Q() === null);
		}
	});
	
	test("'$Q' can handle extraneous things returning null", function(){
		with(this) {
			assert($Q(123) === null);
		}
	});
	
	test("'$Q' can handle array-like things", function(){
		
		function testArguments(){
			return $Q(arguments);
		}
		
		with(this) {
			var q = $Q([1, 2, 3, 4]);
			
			assert(q != null);
			assert(q instanceof Query);
			assertEnumIdentical([1, 2, 3, 4], q.ToArray());
			
			q = $Q({length: 1, 0: "1"});
			
			assert(q != null);
			assert(q instanceof Query);
			assertEnumIdentical(["1"], q.ToArray());
			
			q = testArguments(1, 2, 3, 4, 5);
			
			assert(q != null);
			assert(q instanceof Query);
			assertEnumIdentical([1, 2, 3, 4, 5], q.ToArray());
			
			if(typeof(document) !== 'undefined'){
				// Handles XmlNodeList
				q = $Q(document.getElementsByTagName("BODY"));
				
				assert(q != null);
				assert(q instanceof Query);
				assertEnumIdentical([document.body], q.ToArray());
			}
		}
	});
	
	test("'$Q' does not consider window, function or string to be array-like", function(){
		
		with(this) {
			var q = $Q("");
			
			assert(q == null);
			
			q = $Q(window);
			
			assert(q == null);
			
			q = $Q(function(){});
			
			assert(q == null || q._sourceGenerator === $Q([])._sourceGenerator);
		}
	});
	
	test("'$Q' handles functions like being a generator and uses the supplied context", function(){
		var context = {
			a: 1,
			b: 2
		};
		
		function generate(yield){
			yield(this.a);
			yield(this.b);
		}
		
		with(this) {
			var q = $Q(generate, context);
			
			assert(q != null);
			assert(q instanceof Query);
			assertEnumIdentical([1, 2], q.ToArray());
		}
	});
	
	test("The default Break Signal is a non-null plain JS object", function(){
		
		with(this) {
			var breakSignal = Query.Break();
			
			assertNotNullOrUndefined(breakSignal);
			assert(typeof breakSignal === 'object');
			assert(breakSignal.constructor === Object);
		}
	});
	
	test("Throwing the Break signal from within a yield function stops enumeration", function(){
		
		with(this) {
			var q = $Q([1,2,3]);
			
			var count = 0;
			q.Do(function(){ 
				count++;
				if(count === 2){
					throw Query.Break();
				}
			});
			
			assertIdentical(2, count);
		}
	});
	
	test("A YieldInterceptor specified in Query constructor is used when generating", function(){
		
		with(this) {
			var q = new Query(Query.ArrayLikeGenerator, [1,2,3], function(yield){
				return function(value){
					if(value <= 2){
						yield(value);
					}
				}
			});
			
			assertIdentical(2, q.Count());
		}
	});
	
	test("Initialization of the Break Signal is respected", function(){
		
		with(this) {
			var oldBreak = Query.Break();
			var newBreak = {};
			
			Query.Init({
				breakSignal: newBreak
			});
			
			assertIdentical(newBreak, Query.Break());
			
			
			var q = new Query(Query.ArrayLikeGenerator, [1,2,3], function(yield){
				return function(value){
					yield(value);
					if(value >= 2){
						throw newBreak;
					}
				}
			});
			
			assertIdentical(2, q.Count());
			
			Query.Init({
				breakSignal: oldBreak
			});
		}
	});
	
	test("Initialization of the extension getGenerator is respected", function(){
		with(this) {
			
			var count = 0;
			
			var getGenerator = function(thing, context){
				return function(yield){
					for(var i = 0 ; i < this.count ; i++){
						count++;
						yield(this[i]);
					}
				}
			};
			
			Query.Init({
				getGenerator: getGenerator
			});
			
			var q = $Q({count: 3, 0: "A", 1: "B", 2: "C"});
			
			assertNotNullOrUndefined(q);
			assertInstanceOf(Query, q);
			
			assertEnumIdentical(["A", "B", "C"], q.ToArray());
			assertEnumIdentical(3, count);
			
			Query.Init({
				getGenerator: null
			});
		}
	});
	
	test("Can reset the extension getGenerator", function(){
		with(this) {
			
			Query.Init({
				getGenerator: null
			});
			
			var q = $Q({count: 3, 0: "A", 1: "B", 2: "C"});
			
			assertNull(q);
		}
	});
	
	test("'Do' operator works", function(){
		with(this) {
			var context = {
				factor: 2
			};
			
			var sum = 0;
			$Q([1,2,3]).
			Do(function(n){ sum += this.factor * n;  }, context);
			
			assertIdentical(12, sum);
			
			// <Debug>
			assertRaise('argumentNull', function(){
				new $Q([]).Do(null);
			});
			assertRaise('argumentType', function(){
				new $Q([]).Do('foo');
			});
			// </Debug>
		}
	});
	
	test("'Select' operator works", function(){
		with(this) {
			var context = {
				factor: 2
			};
			
			var q = $Q([1,2,3]).
					Select(function(n){ return this.factor * n * n;}, context);
			
			assertEnumIdentical([2, 8, 18], q.ToArray());
			
			// <Debug>
			assertRaise('argumentNull', function(){
				new $Q([]).Select(null);
			});
			assertRaise('argumentType', function(){
				new $Q([]).Select('foo');
			});
			assertRaise('argumentCount', function(){
				new $Q([]).Select(function(){}, null, 1);
			});
			// </Debug>
		}
	});
	
	test("'Where' operator works", function(){
		with(this) {
			var context = {
				max: 10
			};
				
			var q = $Q([1, 20, 2, 10, 3]).
					Where(function(n){ return n < this.max; }, context);
			
			assertEnumIdentical([1, 2, 3], q.ToArray());
			
			// <Debug>
			assertRaise('argumentNull', function(){
				new $Q([]).Where(null);
			});
			assertRaise('argumentType', function(){
				new $Q([]).Where('foo');
			});
			assertRaise('argumentCount', function(){
				new $Q([]).Where(function(){}, null, 1);
			});
			// </Debug>
		}
	});
	
	test("'WhereNot' operator works", function(){
		with(this) {
			var context = {
				max: 10
			};
			
			var q = $Q([1, 20, 2, 10, 3]).
					WhereNot(function(n){ return n < this.max; }, context);
			
			assertEnumIdentical([20, 10], q.ToArray());
			
			// <Debug>
			assertRaise('argumentNull', function(){
				new $Q([]).WhereNot(null);
			});
			assertRaise('argumentType', function(){
				new $Q([]).WhereNot('foo');
			});
			assertRaise('argumentCount', function(){
				new $Q([]).WhereNot(function(){}, null, 1);
			});
			// </Debug>
		}
	});
	
	test("'Distinct' operator works", function(){
		with(this) {
			var context = {
				max: 10
			};
			
			var o1 = {key: 1}, 
				o2 = {key: 2},
				o3 = {key: 1};
				
			var q1 = $Q([1, 2, 2, 10, 3, 2, null, null, undefined, undefined, o1, o1, o2, o2]).
						Distinct();
			
			// Cannot use object identity...in an generally efficient way.
			// For objects, an appropriate keySelector should be specified.
			assertEnumIdentical([1, 2, 10, 3, null, undefined, o1], q1.ToArray());
			
			var q2 = $Q([o1, o2, o1, o2, o3]).
						Distinct(function(o){ return o.key; });
			
			assertEnumIdentical([o1, o2], q2.ToArray());
			
			// <Debug>
			assertRaise('argumentType', function(){
				new $Q([]).Where('foo');
			});
			assertRaise('argumentCount', function(){
				new $Q([]).Where(function(){}, null, 1);
			});
			// </Debug>
		}
	});
	
	test("'SelectMany' operator works", function(){
		with(this) {
			
			var q = $Q([0, null, undefined, [1, [2, 3]], [4, [5, 6]], [7, [8, 9]], [10, [11, 12]]]).
					SelectMany(function(items){ return items; });
			
			assertEnumIdentical([0, 1, [2, 3], 4, [5, 6], 7, [8, 9], 10, [11, 12]], q.ToArray());
			
			q = $Q([[1], [2], {length: 2, 0: "1", 1: "2"}]).
				SelectMany(function(items){ return items; });
			
			assertEnumIdentical([1, 2, "1", "2"], q.ToArray());
			
			var context = { here: true };
			
			q = $Q([[1], [2]]).
				SelectMany(function(items){ return this.here && items; }, context);
			
			assertEnumIdentical([1, 2], q.ToArray());
			
			// <Debug>
			assertRaise('argumentNull', function(){
				new $Q([]).SelectMany(null);
			});
			assertRaise('argumentType', function(){
				new $Q([]).SelectMany('foo');
			});
			assertRaise('argumentCount', function(){
				new $Q([]).SelectMany(function(){}, null, 1);
			});
			// </Debug>
		}
	});
	
	test("'Flatten' operator works", function(){
		with(this) {
			
			var q = $Q([[1, [2, 3]], [4, [5, 6]], [7, [8, 9]], [10, [11, [12, 13]]]]).
					Flatten();
			
			assertEnumIdentical([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], q.ToArray());
			
			q = $Q([[1], [2], {length: 2, 0: "1", 1: {length: 1, 0: "A"}}]).
				Flatten();
			
			assertEnumIdentical([1, 2, "1", "A"], q.ToArray());
			
			// <Debug>
			assertRaise('argumentCount', function(){
				new $Q([]).Flatten(1);
			});
			// </Debug>
		}
	});
	
	test("'DoWhile' operator works", function(){
		with(this) {
			var context = { max: 10 };
			var q = $Q([1, 5, 2, 10, 3]).
					DoWhile(function(n){ return n < this.max; }, context);
			
			assertEnumIdentical([1, 5, 2], q.ToArray());
			
			// <Debug>
			assertRaise('argumentNull', function(){
				new $Q([]).DoWhile(null);
			});
			assertRaise('argumentType', function(){
				new $Q([]).DoWhile('foo');
			});
			assertRaise('argumentCount', function(){
				new $Q([]).DoWhile(function(){}, null, 1);
			});
			// </Debug>
		}
	});
	
	test("'DoWhileNot' operator works", function(){
		with(this) {
			var context = { max: 10 };
			var q = $Q([11, 10, 2, 10, 3]).
					DoWhileNot(function(n){ return n < this.max; }, context);
			
			assertEnumIdentical([11, 10], q.ToArray());
			
			// <Debug>
			assertRaise('argumentNull', function(){
				new $Q([]).DoWhileNot(null);
			});
			assertRaise('argumentType', function(){
				new $Q([]).DoWhileNot('foo');
			});
			assertRaise('argumentCount', function(){
				new $Q([]).DoWhileNot(function(){}, null, 1);
			});
			// </Debug>
		}
	});
	
	test("'Concat' operator works", function(){
		with(this) {
			var q = Query.ConcatList([[1,2,3,4,5], [6,7,8,9,10], [11,12]]);
			
			assertEnumIdentical([1,2,3,4,5,6,7,8,9,10,11,12], q.ToArray());
			
			// Really breaks the overall sequence traversal, not just the current one
			var count = 0;
			q.Do(function(n){
				count++;
				
				if(n === 7){
					throw new Query.Break();
				}
			});
			
			assertIdentical(7, count);
			
			// Something not convertible no a query
			assertRaise('Error', function(){
				new $Q([]).Concat(null).ToArray();
			});
		}
	});
	
	test("'Get' operator works", function(){
		with(this) {
			
			var q = $Q([null, 1, {foo: 1}, {foo: 2}, {foo: 3}, {bar: 4}]).
					Get('foo');
			
			assertEnumIdentical([undefined, undefined, 1, 2, 3, undefined], q.ToArray());
			
			// <Debug>
			assertRaise('argumentNull', function(){
				new $Q([]).Get(null);
			});
			assertRaise('argumentType', function(){
				new $Q([]).Get(1);
			});
			assertRaise('argumentCount', function(){
				new $Q([]).Get('foo', 'bar');
			});
			// </Debug>
		}
	});
	
	test("'GetExisting' operator works", function(){
		with(this) {
			
			var q = $Q([null, {foo: 1}, {foo: 2}, {foo: 3}, {bar: 4}, {foo: undefined}]).
					GetExisting('foo');
			
			assertEnumIdentical([1, 2, 3, undefined], q.ToArray());
			
			// <Debug>
			assertRaise('argumentNull', function(){
				new $Q([]).GetExisting(null);
			});
			assertRaise('argumentType', function(){
				new $Q([]).GetExisting(1);
			});
			assertRaise('argumentCount', function(){
				new $Q([]).GetExisting('foo', 'bar');
			});
			// </Debug>
		}
	});
	
	test("'Call' operator works", function(){
		with(this) {
			function bar(a, b){ return ("bar" + a) + b; }
			
			var q = $Q([null, {foo: bar}, {foo: bar}, {foo: bar}, {bar: bar}, {foo: null}]).
					Call('foo', 1, 2);
			
			assertEnumIdentical([undefined, "bar12", "bar12", "bar12", undefined, undefined], q.ToArray());
			
			// <Debug>
			assertRaise('argumentNull', function(){
				new $Q([]).Call(null, 1, 2);
			});
			assertRaise('argumentType', function(){
				new $Q([]).Call(1);
			});
			// </Debug>
		}
	});
	
	test("'Apply' operator works", function(){
		with(this) {
			function bar(a, b){ return ("bar" + a) + b; }
			
			var q = $Q([null, {foo: bar}, {foo: bar}, {foo: bar}, {bar: bar}, {foo: null}]).
					Apply('foo', [1, 2]);
			
			assertEnumIdentical([undefined, "bar12", "bar12", "bar12", undefined, undefined], q.ToArray());
			
			// <Debug>
			assertRaise('argumentNull', function(){
				new $Q([]).Apply(null, [1, 2]);
			});
			assertRaise('argumentNull', function(){
				new $Q([]).Apply('foo', null);
			});
			assertRaise('argumentType', function(){
				new $Q([]).Apply(1, [1, 2]);
			});
			assertRaise('argumentType', function(){
				new $Q([]).Apply('foo', 1);
			});
			assertRaise('argumentCount', function(){
				new $Q([]).Apply('foo', [1, 2], null);
			});
			// </Debug>
		}
	});
	
	test("'Keys' operator works", function(){
		with(this) {
			var q = $Q([{key: "1"}, {key: "2"}, {key: "3"}]).Keys();
			
			assertEnumIdentical(["1", "2", "3"], q.ToArray());
			
			// <Debug>
			assertRaise('argumentCount', function(){
				q.Keys(Boolean);
			});
			// </Debug>
		}
	});
	
	test("'Values' operator works", function(){
		with(this) {
			var q = $Q([{value: "1"}, {value: "2"}, {value: "3"}]).Values();
			
			assertEnumIdentical(["1", "2", "3"], q.ToArray());
			
			// <Debug>
			assertRaise('argumentCount', function(){
				q.Values(Boolean);
			});
			// </Debug>
		}
	});
	
	test("'Min' operator works", function(){
		with(this) {
			var q = $Q([1, 20, 0, 3]);
			
			assertIdentical(0, q.Min());
			
			q = $Q([]);
			
			assertIdentical(undefined, q.Min());
			
			// <Debug>
			assertRaise('argumentCount', function(){
				q.Min(Boolean);
			});
			// </Debug>
		}
	});
	
	test("'Max' operator works", function(){
		with(this) {
			var q = $Q([1, 20, 0, 3]);
			
			assertIdentical(20, q.Max());
			
			q = $Q([]);
			
			assertIdentical(undefined, q.Max());
			
			// <Debug>
			assertRaise('argumentCount', function(){
				q.Max(Boolean);
			});
			// </Debug>
		}
	});
	
	test("'Sum' operator works", function(){
		with(this) {
			var q = $Q([1, 20, 0, 3]);
			
			assertIdentical(24, q.Sum());
			
			q = $Q([]);
			
			assertIdentical(0, q.Sum());
			
			// <Debug>
			assertRaise('argumentCount', function(){
				q.Sum(Boolean);
			});
			// </Debug>
		}
	});
	
	test("'Contains' operator works", function(){
		with(this) {
			var q = $Q([1, 20, "0", 3]);
			
			assert(q.Contains(1) === true);
			assert(q.Contains("1") === false);
			assert(q.Contains(0) === false);
			assert(q.Contains("0") === true);
			
			var count = 0;
			var q1 = q.Select(function(thing){
				count++;
				return thing;
			});
			
			q1.Contains(1);
			assertIdentical(1, count);
			
			count = 0;
			q1.Contains(20);
			assertIdentical(2, count);
			
			count = 0;
			q1.Contains("0");
			assertIdentical(3, count);
			
			// <Debug>
			assertRaise('argumentCount', function(){
				q.Contains();
			});
			assertRaise('argumentCount', function(){
				q.Contains(1, 2);
			});
			// </Debug>
		}
	});
	
	test("'First' operator works", function(){
		with(this) {
			var q = $Q([1, 20, "0", 3]);
			
			assertIdentical(1, q.First());
			
			q = $Q([]);
			
			assertIdentical(undefined, q.First());
			
			// <Debug>
			assertRaise('argumentCount', function(){
				q.First(Boolean);
			});
			// </Debug>
		}
	});
	
	test("'All' operator works", function(){
		with(this) {
			var q = $Q([1, 20, "0", 3, true, {}, []]);
			
			assert(q.All() === true);
			
			q = $Q([1, 0, "0", true]);
			
			assert(q.All() === false);
			
			// Stops as soon as it is false
			var count = 0;
			q = $Q(function(yield){
				count++;
				yield(1);
				
				count++;
				yield(0);
				
				count++;
				yield(3);
			});
			
			assert(!q.All());
			assertIdentical(2, count);
			
			// <Debug>
			assertRaise('argumentCount', function(){
				q.All(Boolean);
			});
			// </Debug>
		}
	});
	
	test("'Any' operator works", function(){
		with(this) {
			var q = $Q([0, "", null, undefined, 1, null]);
			
			assert(q.Any() === true);
			
			q = $Q([false, 0, "", NaN]);
			
			assert(q.Any() === false);
			
			// Stops as soon as it is true
			var count = 0;
			q = $Q(function(yield){
				count++;
				yield(0);
				
				count++;
				yield(1);
				
				count++;
				yield(2);
			});
			
			assert(q.Any());
			assertIdentical(2, count);
			
			// <Debug>
			assertRaise('argumentCount', function(){
				q.Any(Boolean);
			});
			// </Debug>
		}
	});
	
	test("'Exists' operator works", function(){
		with(this) {
			var q = $Q([]);
			
			assert(q.Exists() === false);
			
			q = $Q([false]);
			
			assert(q.Exists() === true);
			
			// Stops as soon as it is true
			var count = 0;
			q = $Q(function(yield){
				count++;
				yield(0);
				
				count++;
				yield(1);
				
				count++;
				yield(2);
			});
			
			q.Exists();
			
			assertIdentical(1, count);
			
			// <Debug>
			assertRaise('argumentCount', function(){
				q.Exists(Boolean);
			});
			// </Debug>
		}
	});
	
	test("'Count' operator works", function(){
		with(this) {
			var q = $Q([]);
			
			assertIdentical(0, q.Count());
			
			q = $Q([1, undefined]);
			
			assertIdentical(2, q.Count());
			
			// <Debug>
			assertRaise('argumentCount', function(){
				q.Count(Boolean);
			});
			// </Debug>
		}
	});
	
	test("'Reduce' operator works", function(){
		with(this) {
			var context = {
				factor: 2
			};
			
			function operation(a, b){
				return this.factor * a * b;
			}
			
			var q = $Q([]);
			
			assertIdentical(0, q.Reduce(0, operation, context));
			assertIdentical(1, q.Reduce(1, operation, context));
			
			q = $Q([1, 2]);
			
			assertIdentical(0, q.Reduce(0, operation, context));
			assertIdentical(8, q.Reduce(1, operation, context));
			
			q = $Q([1, 2, 3]);
			
			assertIdentical(48, q.Reduce(1, operation, context));
		}
	});
	
	test("Operator composition works", function(){
		with(this) {
			var context1 = {
				factor: 3
			};
			
			var context2 = {
				modulo: 2
			};
			
			var q = $Q([1,2,3,4,5,6,7,8,9,10]).
					Select(function(n){ return (n * this.factor);       }, context1).
					Where (function(n){ return (n % this.modulo) === 0; }, context2);
			
			assertEnumIdentical([6, 12, 18, 24, 30], q.ToArray());
		}
	});
	
	test("Operator composition is lazy", function(){
		with(this) {
			var context1 = {
				factor: 3
			};
			
			var context2 = {
				modulo: 2
			};
			
			var countSelect = 0;
			var countWhere  = 0;
			
			var q = $Q([1,2,3,4,5,6,7,8,9,10]).
					Select(function(n){ 
						countSelect++;
						return (n * this.factor);
					}, context1).
					Where (function(n){ 
						countWhere++;
						return (n % this.modulo) === 0; 
					}, context2);
			
			assertIdentical(6, q.First());
			assertIdentical(2, countSelect);
			assertIdentical(2, countWhere);
		}
	});
	
	return testDef;
}