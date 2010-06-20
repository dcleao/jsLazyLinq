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

	function qDo(iterator, context) {
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

	function qGenerate(yield){
		if(this._yieldInterceptor){
			yield = this._yieldInterceptor(yield);
		}

		this._sourceGenerate.call(this._source, yield);
	}

	// ---------------------------
	// Reducers

	function qToArray() {
		// <Debug>
		Assert.argumentCount(0);
		// </Debug>
		var result = [];
		this.Do(function(value){ result.push(value); });
		return result;
	}

	function qCount() {
		// <Debug>
		Assert.argumentCount(0);
		// </Debug>
		var count = 0;
		this.Do(function(){ count++; });
		return count;
	}

	function qExists() {
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

	function qAny() {
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

	function qAll() {
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

	function qFirst() {
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

	function qContains(value){
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

	function qSum(){
		// <Debug>
		Assert.argumentCount(0);
		// </Debug>
		return this.Reduce(0, number_add);
	}

	function qMax() {
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

	function qMin() {
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

	function qReduce(memo, combine, context) {
		// <Debug>
		Assert.argumentCount(2, 3);
		// </Debug>
		this.Do(function(value, index) {
			memo = combine.call(context, memo, value, index);
		});
		return memo;
	}

	// ----------------------------
	function qSelect(selector, context){
		// <Debug>
		Assert.argumentNotNullFunc(selector, 'selector');
		Assert.argumentCount(1, 2);
		// </Debug>
		return this._intercept(function(yield){

			function qSelectYield(value){
				yield( selector.call(context, value) );
			}

			return qSelectYield;
		});
	}
	
	function qSelectMany(selector, context){
		// <Debug>
		Assert.argumentNotNullFunc(selector, 'selector');
		Assert.argumentCount(1, 2);
		// </Debug>
		return this._intercept(function(yield){

			function qSelectManyYield(value){
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

			return qSelectManyYield;
		});
	}
	
	function qWhere(predicate, context) {
		// <Debug>
		Assert.argumentNotNullFunc(predicate, 'predicate');
		Assert.argumentCount(1, 2);
		// </Debug>
		return this._intercept(function(yield){

			function qWhereYield(value){
				if(predicate.call(context, value)){
					yield( value );
				}
			}

			return qWhereYield;
		});
	}
	
	function qWhereNot(predicate, context) {
		// <Debug>
		Assert.argumentNotNullFunc(predicate, 'predicate');
		Assert.argumentCount(1, 2);
		// </Debug>
		return this._intercept(function(yield){

			function qWhereNotYield(value){
				if(!predicate.call(context, value)){
					yield( value );
				}
			}

			return qWhereNotYield;
		});
	}
	
	function qDistinct(keySelector, context) {
		// <Debug>
		Assert.argumentFunc(keySelector, 'keySelector');
		Assert.argumentCount(0, 2);
		// </Debug>
		return this._intercept(function(yield){

			var keys = {};

			function qDistinctYield(value){
				var key = keySelector ? keySelector.call(context, value) : value;
				key += ''; // convert to string
				if(!keys.hasOwnProperty(key)){
					keys[key] = true;
					yield( value );
				}
			}

			return qDistinctYield;
		});
	}
	
	function qFlatten(){
		// <Debug>
		Assert.argumentCount(0);
		// </Debug>
		return this._intercept(function(yield){

			function qFlattenYield(value){

				var query = $Q(value);
				if (query) {
					query._generate(qFlattenYield);
				} else {
					yield( value );
				}
			}

			return qFlattenYield;
		});
	}
	
	function qWhile(predicate, context) {
		// <Debug>
		Assert.argumentNotNullFunc(predicate, 'predicate');
		Assert.argumentCount(1,2);
		// </Debug>
		return this._intercept(function(yield){

			function qWhileYield(value){
				if (!predicate.call(context, value)) {
					throw _break;
				}

				yield( value );
			}

			return qWhileYield;
		});
	}
	
	function qWhileNot(predicate, context) {
		// <Debug>
		Assert.argumentNotNullFunc(predicate, 'predicate');
		Assert.argumentCount(1,2);
		// </Debug>
		return this._intercept(function(yield){

			function qWhileNotYield(value){
				if (predicate.call(context, value)) {
					throw _break;
				}

				yield( value );
			}

			return qWhileNotYield;
		});
	}
	
	function qConcat(){
		return qConcatList([this].concat(_slice.apply(arguments)));
	}
	
	function qGet(property) {
		// <Debug>
		Assert.argumentNotNullString(property, 'property');
		Assert.argumentCount(1);
		// </Debug>
		return this.Select(function(o) { return o ? o[property] : undefined; });
	}
	
	function qGetExisting(property) {
		// <Debug>
		Assert.argumentNotNullString(property, 'property');
		Assert.argumentCount(1);
		// </Debug>
		return this._intercept(function(yield){

			function qGetExistingYield(value){
				if (value && (property in value)) {
					yield( value[property] );
				}
			}

			return qGetExistingYield;
		});
	}
	
	function qCall(method /*, arg1, arg2, ...*/) {
		// <Debug>
		Assert.argumentNotNullString(method, 'method');
		// </Debug>
		return this.Select(createMethodCall(method, _slice.call(arguments, 1)));
	}
	
	function qApply(method, args) {
		// <Debug>
		Assert.argumentNotNullString(method, 'method');
		Assert.argumentNotNullArrayLike(args, 'args');
		Assert.argumentCount(2);
		// </Debug>
		return this.Select(createMethodCall(method, args));
	}
	
	// For Hash-like
	function qKeys() {
		// <Debug>
		Assert.argumentCount(0);
		// </Debug>
		return this.Select(getKey);
	}
	
	function qValues() {
		// <Debug>
		Assert.argumentCount(0);
		// </Debug>
		return this.Select(getValue);
	}
	
	// ----------------------------
	// Static
	
	function qBreak(){
		// <Debug>
		Assert.argumentCount(0);
		// </Debug>
		return _break;
	}
	
	function qInit(params){
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
	}
	
	function qConcatList(queries) {
		// <Debug>
		Assert.argumentNotNullArrayLike(queries, 'queries');
		// </Debug>

		function qConcat_generate(yield){
			for(var i = 0, L = queries.length ; i < L ; i++){
				var q = $Q(queries[i]);
				if(!q){
					throw new Error("Cannot convert argument to Query.");
				}

				q._generate(yield);
			}
		}

		return new Query(qConcat_generate);
	}
	
	function qArrayLikeGenerator(yield){
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
				return new Query(qArrayLikeGenerator, thing);
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
	
	function copyDoubleCase(dest, source){
		for(var p in source){
			if(source.hasOwnProperty(p)){
				var v 	  = source[p],
					pc 	  = p.charAt(0),
					prest = p.substr(1);
				
				dest[pc.toLowerCase() + prest] = v;
				dest[pc.toUpperCase() + prest] = v;
			}
		}
	}
	
	Query.prototype = {

		_generate: 	qGenerate,

		_intercept: function(yieldInterceptor){
			// <Debug>
			Assert.argumentNotNullFunc(yieldInterceptor, 'yieldInterceptor');
			Assert.argumentCount(1);
			// </Debug>
			return new Query(qGenerate, this, yieldInterceptor);
		},

		Do:	qDo
	};
	
	copyDoubleCase(Query.prototype, {
		// -----------------------
		// To leave the query
		each:		qDo,
		toArray:	qToArray,
		reduce:		qReduce,
		count:		qCount,
		exists:		qExists,
		any:		qAny,
		all: 	  	qAll,
		first: 		qFirst,
		contains:  	qContains,
		sum:		qSum,
		max:		qMax,
		min:		qMin,

		// -----------------------
		// To refine the query
		select: 	qSelect,
		selectMany: qSelectMany, 
		where: 		qWhere,
		whereNot: 	qWhereNot,
		distinct:	qDistinct,
		flatten: 	qFlatten, 
		doWhile:	qWhile,
		doWhileNot: qWhileNot,
		concat: 	qConcat, 
		get: 		qGet, 
		getExisting: qGetExisting, 
		call: 		qCall, 
		apply: 		qApply, 
		keys: 		qKeys, 
		values: 	qValues
	});
	
	Query.$break = 
	Query.Break  = qBreak;
	
	copyDoubleCase(Query, {
		arrayLikeGenerator: qArrayLikeGenerator, // mainly for tests
		create:		$Q,
		init: 		qInit,
		concatList:	qConcatList
	});
	
	// ----------------------------

	// Global Exports
	_.Query = Query;
	_.$Q    = $Q;
})(this);