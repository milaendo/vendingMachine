const express = require('express')
const app = express()
const path = require('path')
const mustacheExpress = require('mustache-express');
const bodyParser = require('body-parser')
const config = require('config')
const mysql = require('mysql')

app.use(bodyParser.urlencoded({extended:false}))
app.use(bodyParser.json())
app.engine('mustache', mustacheExpress())
app.set('views', './views')
app.set('view engine', 'mustache')
app.use(express.static(path.join(__dirname, 'static')))

const conn = mysql.createConnection({
  host: config.get('db.host'),
  database: config.get('db.database'),
  user: config.get('db.user'),
  password: config.get('db.password')
})

/*  
	*this returns all of the item information
 	*url:/api/customer/items
 	*return: {
		id: int
		name: string
		cost: int
		quanitity: int
 	}
*/

// GET /api/customer/items - get a list of items
app.get("/api/customer/items", function(req, res, next){
	const sql = `SELECT * from items`

	conn.query(sql,function(err, results, fields){
		let info = {items:results}
		res.json(info)
	})
})
/*
	*
	*this will check if an item is in stock, if there && the customer has enough money, the transaction will be made && item will be subtracted from inventory
	*
*/
// POST /api/customer/items/:itemId/purchases - purchase an item
app.post("/api/customer/items/:itemid/purchases",function(req,res,next){
	const timestamp = new Date()
	const itemid = req.params.itemid
	const cost = req.body.cost
	const sql1 = 'select * from items where iditems = ? and quantity > 0'
	const sql2 = `INSERT into transactions (timestamp, itemid) VALUES (?,?)`
	const sql3 = `UPDATE items set items.quantity = quantity-1, purchased = purchased +1 where iditems = ?;`

	conn.query(sql1, [itemid], function(err, results, fields){
		console.log(err)
		if(err || results.length < 1){
			console.log('results length', results.length)
			res.json("There are no items to buy")
		}
		else{
			if (cost > results[0].cost){
				conn.query(sql2,[timestamp,itemid],function(err,results, fields){
					if(err){
						res.json("cant do that yo")
					}
					else{
						conn.query(sql3, [itemid], function(err, results,fields){
							if (err){
								res.json("didnt work")
							}
							else {
								res.json("item purchased")
								res.json(results.insertid)
							}
						})
						
					}
			})
			}
			else {
				res.json("you broke")
			}	
		}
	})

})

/*
	*this returns all of the items that have been puchased from the vendor
	*return{
	name: string
	timestamp: datetime
	idtransaction: int
	}
	*
*/
// GET /api/vendor/purchases - get a list of all purchases with their item and date/time
app.get("/api/vendor/purchases", function(req, res,next){
	const sql = `
SELECT 
    name, timestamp, idtransactions
FROM
    transactions
        JOIN
    items ON itemid = iditems`

    conn.query(sql,function(err, results, fields){
    	let stuff = {transactions: results}
    	res.json(stuff)
    })
})

/*
	*this returns the amount of money taken in after puchases have been made
	*return {
	purchased: int 
	moneyin : int 
	}
*/
// GET /api/vendor/money - get a total amount of money accepted by the machine
app.get("/api/vendor/money",function(req, res, next){
	const sql = `
SELECT 
    purchased, SUM(purchased * cost) AS moneyin
FROM
    items;`

    conn.query(sql, function(err, results, fields){
    	let stuff = {transactions: results}
    	res.json(stuff)
    })
})

// POST /api/vendor/items - add a new item not previously existing in the machine
app.post("/api/vendor/items", function(req, res, next){
	const name = req.body.name
	const cost = req.body.cost
	const quantity = req.body.quantity
	const sql = `insert into items (name, cost, quantity) values (?, ?, ?);`

	conn.query(sql,[name, cost, quantity],function(err, results, fields){
		let stuff = {transactions: results}
		if (err){
			res.json("yo you messed up")
		}
		else {
		res.json("item has been inserted")
		res.json(stuff)
		}
	})
})

// PUT /api/vendor/items/:itemId - update item quantity, description, and cost
app.put("/api/vendor/items/:itemId",function(req,res,next){
	const itemid = req.params.itemId
	const cost = req.body.cost
	const quantity = req.body.quantity
	const sql = `
UPDATE items 
SET 
    cost = ?,
    quantity = ?
WHERE
    iditems = ?;`

    conn.query(sql, [cost,quantity,itemid],function(err, results, fields){
    	let stuff = {items: results}
    	if(err){
    		res.json("cant do that")
    	}
    	else {
    		res.json("info updated")
    		res.json(stuff)
    	}
    })
})



app.listen(config.get('port'), function(){
  console.log("App running is running on" + config.get('port'))
})