/*  jsLazyLinq JavaScript framework, version 0.1.1
*  (c) 2010 Duarte Cunha Leão
*
*  jsLazyLinq is freely distributable under the terms of an MIT-style license.
*  For details, see the http://github.com/dcleao/jsLazyLinq
*--------------------------------------------------------------------------*/
(function(_){

	_.jsLazyLinq = {
		Version: '0.1.1'
	};

	var _slice = Array.prototype.slice,
		_break = {},
		_getGenerator;

	function isFunction(value){
		return typeof value === 'function';
	}

	function isArrayLike(value){
		return value && ((value instanceof Array) ||
						(typeof value.length === 'number' && // window has length and string has length
						typeof value !== 'string' &&
						typeof value !== 'function' &&
						!value.setTimeout));
	}

	function number_add(n1, n2){
		return n1 + n2;
	}

	function getKey(pair) {
		return pair.key;
	}

	function getValue(pair) {
		return pair.value;
	}

	function createMethodCall(name, args){

		function methodCall(o) {
			var m = o && o[name];
			return m ? m.apply(o, args): undefined;
		}

		return methodCall;
	}

	// <Debug>
	var Errors = {
		argumentNull: function(name){
			var ex = new Error("Argument '" + name + "' is null");
			ex.name = "argumentNull";
			return ex;
		},

		argumentType: function(name, type){
			var ex = new Error("Argument '" + name + "' is not of type '" + type + "'");
			ex.name = "argumentType";
			return ex;
		},

		invalidOperation: function(message){
			var ex = new Error("Invalid operation." + (message ? ("\n" + message) : "") );
			ex.name = "invalidOperation";
			return ex;
		},

		argumentCount: function(expected, actual){
			var ex = new Error("Invalid argument count: " + actual + ". Expected: " + expected + ".");
			ex.name = "argumentCount";
			return ex;
		}
	};

	var Assert = {
		argumentNotNullFunc: function(value, name){
			if(!value){ throw Errors.argumentNull(name); }
			if(!isFunction(value)){ throw Errors.argumentType(name, 'function'); }
		},

		argumentFunc: function(value, name){
			if(value && !isFunction(value)){ throw Errors.argumentType(name, 'function'); }
		},

		argumentNotNullString: function(value, name){
			if(value == null){ throw Errors.argumentNull(name); }
			if(typeof value !== 'string'){ throw Errors.argumentType(name, 'string'); }
		},

		argumentNotNullArrayLike: function(value, name){
			if(value == null){ throw Errors.argumentNull(name); }
			if(!isArrayLike(value)){ throw Errors.argumentType(name, 'array-like'); }
		},

		argumentCount: function(expectedMin, expectedMax){
			var actual = arguments.callee.caller.arguments.length;
			if(expectedMax == null && actual !== expectedMin) { throw Errors.argumentCount(expectedMin, actual); }
			if(expectedMax != null && (actual < expectedMin || actual > expectedMax)) { throw Errors.argumentCount(expectedMin  + "-" + expectedMax, actual); }
		}
	};
	// </Debug>

	function query_do(iterator, context) {
		// <Debug>
		Assert.argumentNotNullFunc(iterator, 'iterator');
		Assert.argumentCount(1, 2);
		// </Debug>
		var index = 0;

		try {

			this._generate(function(value) {
				iterator.call(context, value, index++);
			});

		} catch (ex) {
			if (ex !== _break) {
				throw ex;
			}
		}

		return this;
	}

	function query_generate(yield){
		if(this._yieldInterceptor){
			yield = this._yieldInterceptor(yield);
		}

		this._sourceGenerate.call(this._source, yield);
	}

	// ---------------------------
	// Reducers

	function query_toArray() {
		// <Debug>
		Assert.argumentCount(0);
		// </Debug>
		var result = [];
		this.Do(function(value){ result.push(value); });
		return result;
	}

	function query_count() {
		// <Debug>
		Assert.argumentCount(0);
		// </Debug>
		var count = 0;
		this.Do(function(){ count++; });
		return count;
	}

	function query_exists() {
		// <Debug>
		Assert.argumentCount(0);
		// </Debug>
		var exists = false;
		this.Do(function() {
			exists = true;
			throw _break;
		});
		return exists;
	}

	function query_any() {
		// <Debug>
		Assert.argumentCount(0);
		// </Debug>
		var result = false;
		this.Do(function(value) {
			result = !!value;
			if(result){
				throw _break;
			}
		});
		return result;
	}

	function query_all() {
		// <Debug>
		Assert.argumentCount(0);
		// </Debug>
		var result = true;
		this.Do(function(value) {
			result = !!value;
			if(!result){
				throw _break;
			}
		});
		return result;
	}

	function query_first() {
		// <Debug>
		Assert.argumentCount(0);
		// </Debug>
		var first;
		this.Do(function(value) {
			first = value;
			throw _break;
		});
		return first;
	}

	function query_contains(value){
		// <Debug>
		Assert.argumentCount(1);
		// </Debug>
		var found = false;
		this.Do(function(value2) {
			if(value2 === value){
				found = true;
				throw _break;
			}
		});
		return found;
	}

	function query_sum(){
		// <Debug>
		Assert.argumentCount(0);
		// </Debug>
		return this.Reduce(0, number_add);
	}

	function query_max() {
		// <Debug>
		Assert.argumentCount(0);
		// </Debug>
		var result;
		this.Do(function(value) {
		if (result == null || value > result)
			result = value;
		});
		return result;
	}

	function query_min() {
		// <Debug>
		Assert.argumentCount(0);
		// </Debug>
		var result;
		this.Do(function(value) {
		if (result == null || value < result)
			result = value;
		});
		return result;
	}

	function query_reduce(memo, combine, context) {
		// <Debug>
		Assert.argumentCount(2, 3);
		// </Debug>
		this.Do(function(value, index) {
		memo = combine.call(context, memo, value, index);
		});
		return memo;
	}

	// ----------------------------

	function query_break(){
		// <Debug>
		Assert.argumentCount(0);
		// </Debug>
		return _break;
	}

	function query_arrayLikeGenerator(yield){
		for(var i = 0, L = this.length ; i < L ; i++){
			yield(this[i]);
		}
	}

	function $Q(thing, context) {
		if(thing) {
			if(thing instanceof Query){
				return thing;
			}

			if(isArrayLike(thing)){
				return new Query(query_arrayLikeGenerator, thing);
			}

			if(isFunction(thing)){
				return new Query(thing, context);
			}

			if (_getGenerator){
				var gen = _getGenerator(thing, context);
				if(gen){
					return new Query(gen, thing);
				}
			}
		}
		return null;
	}

	// -----------------------------

	function Query(sourceGenerate, source, yieldInterceptor){
		// <Debug>
		Assert.argumentNotNullFunc(sourceGenerate, 'sourceGenerate');
		Assert.argumentCount(1, 3);
		// </Debug>

		this._sourceGenerate = sourceGenerate;
		this._source = source; // context

		if(yieldInterceptor){
			// <Debug>
			Assert.argumentFunc(yieldInterceptor, 'yieldInterceptor');
			// </Debug>
			this._yieldInterceptor = yieldInterceptor;
		}
	}

	Query.prototype = {

		_generate: 	query_generate,

		_intercept: function(yieldInterceptor){
			// <Debug>
			Assert.argumentNotNullFunc(yieldInterceptor, 'yieldInterceptor');
			Assert.argumentCount(1);
			// </Debug>
			return new Query(query_generate, this, yieldInterceptor);
		},

		// -----------------------
		// To leave the query
		Do:      	query_do,
		ToArray:   	query_toArray,
		Reduce:    	query_reduce,
		Count:		query_count,
		Exists:		query_exists,
		Any:		query_any,
		All: 	  	query_all,
		First: 	   	query_first,
		Contains:  	query_contains,
		Sum:	   	query_sum,
		Max:       	query_max,
		Min:	   	query_min,

		// -----------------------
		// To refine the query
		Select: function(selector, context){
			// <Debug>
			Assert.argumentNotNullFunc(selector, 'selector');
			Assert.argumentCount(1, 2);
			// </Debug>
			return this._intercept(function(yield){

				function query_select_yield(value){
					yield( selector.call(context, value) );
				}

				return query_select_yield;
			});
		},

		SelectMany: function(selector, context){
			// <Debug>
			Assert.argumentNotNullFunc(selector, 'selector');
			Assert.argumentCount(1, 2);
			// </Debug>
			return this._intercept(function(yield){

				function query_selectMany_yield(value){
					var values = selector.call(context, value);
					if (values != null){
						var query = $Q(values);
						if (query) {
							query._generate(yield);
						} else {
							yield( values );
						}
					}
				}

				return query_selectMany_yield;
			});
		},

		Where: function(predicate, context) {
			// <Debug>
			Assert.argumentNotNullFunc(predicate, 'predicate');
			Assert.argumentCount(1, 2);
			// </Debug>
			return this._intercept(function(yield){

				function query_where_yield(value){
					if(predicate.call(context, value)){
						yield( value );
					}
				}

				return query_where_yield;
			});
		},

		WhereNot: function(predicate, context) {
			// <Debug>
			Assert.argumentNotNullFunc(predicate, 'predicate');
			Assert.argumentCount(1, 2);
			// </Debug>
			return this._intercept(function(yield){

				function query_whereNot_yield(value){
					if(!predicate.call(context, value)){
						yield( value );
					}
				}

				return query_whereNot_yield;
			});
		},

		Distinct: function(keySelector, context) {
			// <Debug>
			Assert.argumentFunc(keySelector, 'keySelector');
			Assert.argumentCount(0, 2);
			// </Debug>
			return this._intercept(function(yield){

				var keys = {};

				function query_distinct_yield(value){
					var key = keySelector ? keySelector.call(context, value) : value;
					key += ''; // convert to string
					if(!keys.hasOwnProperty(key)){
						keys[key] = true;
						yield( value );
					}
				}

				return query_distinct_yield;
			});
		},

		Flatten: function(){
			// <Debug>
			Assert.argumentCount(0);
			// </Debug>
			return this._intercept(function(yield){

				function query_flatten_yield(value){

					var query = $Q(value);
					if (query) {
						query._generate(query_flatten_yield);
					} else {
						yield( value );
					}
				}

				return query_flatten_yield;
			});
		},

		While: function(predicate, context) {
			// <Debug>
			Assert.argumentNotNullFunc(predicate, 'predicate');
			Assert.argumentCount(1,2);
			// </Debug>
			return this._intercept(function(yield){

				function query_while_yield(value){
					if (!predicate.call(context, value)) {
						throw _break;
					}

					yield( value );
				}

				return query_while_yield;
			});
		},

		WhileNot: function(predicate, context) {
			// <Debug>
			Assert.argumentNotNullFunc(predicate, 'predicate');
			Assert.argumentCount(1,2);
			// </Debug>
			return this._intercept(function(yield){

				function query_whileNot_yield(value){
					if (predicate.call(context, value)) {
						throw _break;
					}

					yield( value );
				}

				return query_whileNot_yield;
			});
		},

		Concat: function(){
			return Query.ConcatList([this].concat(_slice.apply(arguments)));
		},

		Get: function(property) {
			// <Debug>
			Assert.argumentNotNullString(property, 'property');
			Assert.argumentCount(1);
			// </Debug>
			return this.Select(function(o) { return o ? o[property] : undefined; });
		},

		GetExisting: function(property) {
			// <Debug>
			Assert.argumentNotNullString(property, 'property');
			Assert.argumentCount(1);
			// </Debug>
			return this._intercept(function(yield){

				function query_getExisting_yield(value){
					if (value && (property in value)) {
						yield( value[property] );
					}
				}

				return query_getExisting_yield;
			});
		},

		Call: function(method /*, arg1, arg2, ...*/) {
			// <Debug>
			Assert.argumentNotNullString(method, 'method');
			// </Debug>
			return this.Select(createMethodCall(method, _slice.call(arguments, 1)));
		},

		Apply: function(method, args) {
			// <Debug>
			Assert.argumentNotNullString(method, 'method');
			Assert.argumentNotNullArrayLike(args, 'args');
			Assert.argumentCount(2);
			// </Debug>
			return this.Select(createMethodCall(method, args));
		},

		// For Hash-like
		Keys: function() {
			// <Debug>
			Assert.argumentCount(0);
			// </Debug>
			return this.Select(getKey);
		},

		Values: function() {
			// <Debug>
			Assert.argumentCount(0);
			// </Debug>
			return this.Select(getValue);
		}
	};

	Query.ArrayLikeGenerator = query_arrayLikeGenerator; // mainly for tests
	Query.Break  = query_break;
	Query.Create = $Q;
	Query.Init = function(params){
		// <Debug>
		if(!params) throw Error.argumentNull('params');
		Assert.argumentCount(1);
		// </Debug>

		if(params.breakSignal){
			_break = params.breakSignal;
		}

		if('getGenerator' in params){
			// <Debug>
			Assert.argumentFunc(params.getGenerator, 'params.getGenerator');
			// </Debug>
			_getGenerator = params.getGenerator; // may be null
		}
	};

	Query.ConcatList = function(queries) {
		// <Debug>
		Assert.argumentNotNullArrayLike(queries, 'queries');
		// </Debug>

		function query_concat_generate(yield){
			for(var i = 0, L = queries.length ; i < L ; i++){
				var q = $Q(queries[i]);
				if(!q){
					throw new Error("Cannot convert argument to Query.");
				}

				q._generate(yield);
			}
		}

		return new Query(query_concat_generate);
	};

	// ----------------------------

	// Exports
	_.Query = Query;
	_.$Q    = $Q;
})(this);