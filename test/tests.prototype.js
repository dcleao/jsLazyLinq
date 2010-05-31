
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
	
	
	test("Query is accessible in prototype's enumerables", function(){
		with(this) {
			assert(typeof ([].query) === 'function');
			
			var q = [1,2,3,4].query();
			
			assertInstanceOf(Query, q);
			
			assertEnumIdentical([1,2,3,4], q.ToArray());
		}
	});
	
	test("prototype's _each is acceptable as a jsLinq generator", function(){
		with(this) {
			var q = $Q({
				_each: function(yield){
					yield(1);
					yield(2);
					yield(3);
					yield(4);
				}
			});
			
			assertNotNullOrUndefined(q);
			
			assertInstanceOf(Query, q);
			
			assertEnumIdentical([1,2,3,4], q.ToArray());
		}
	});
	
	test("prototype's $break is identical to Query.Break()", function(){
		with(this) {
			assertIdentical($break, Query.Break());
		}
	});
	
	test("prototype's $break actually breaks", function(){
		with(this) {
			var q = $Q({
				_each: function(yield){
					yield(1);
					yield(2);
					yield(3);
					yield(4);
				}
			});
			
			var a = [];
			q.Do(function(n){
				a.push(n);
				if (n >= 2){
					throw $break;
				}
			});
			
			assertEnumIdentical([1,2], a);
		}
	});
	
	test("Hash is queryable", function(){
		with(this) {
			var h = new Hash({a:1, b:2, c:3});
			
			var q = $Q(h);
			
			assertEnumIdentical([1,2,3], q.Values().ToArray());
			assertEnumIdentical(['a','b','c'], q.Keys().ToArray());
		}
	});
	
	test("query() method is available on Enumerables", function(){
		with(this) {
			var h = new Hash({a:1, b:2, c:3});
			
			var q = h.query();
			
			assertEnumIdentical([1,2,3], q.Values().ToArray());
			assertEnumIdentical(['a','b','c'], q.Keys().ToArray());
			
			var q = [1,2,3].query();
			assertEnumIdentical([1,2,3], q.ToArray());
		}
	});

	return testDef;
}