// LOGGER API
var db = require('./db_connect');
var express = require("express");
var request = require('request');
var cheerio = require('cheerio');
var async = require("async");
var app = express();
var fetch = require('node-fetch');
var squel = require("squel");

var spell_cache = {};

 var globalQueryConfig = {
    replaceSingleQuotes : true,
    singleQuoteReplacement : "\\'",
    autoQuoteTableNames: true,
    autoQuoteFieldNames: true
  };

function getUpdateQuery(tableName, whereCondition, currentRow, newRow) {

                var key,
                    diff = false,
                    query = squel.update(globalQueryConfig);

                query.table(tableName);

                for (key in currentRow) {
                  if (currentRow[key] !== newRow[key]) {

                    // Convert numeric values
                    if (!isNaN(currentRow[key]) && !isNaN(newRow[key]) && newRow[key] != "") {
                      newRow[key] = Number(newRow[key]);
                    }

                    query.set(key, newRow[key]);
                    diff = true;
                  }
                }

                if (!diff) {
                  console.log("[INFO] There are no `" + tableName + "` changes");
                  return "";
                }

                query.where(whereCondition);

                return "-- Table `" + tableName + "`\n" + query.toString() + ";\n\n";
                };

function search_spell(params, callback){
    
        // Store Cache
        if(spell_cache[params.spell_id])
        {
             data = {};
             data.id = params.spell_id;
             data.name = spell_cache[params.spell_id]; 
            
             return callback(data); 
        }
    
    try{
        fetch('http://www.wowhead.com/spell='+params.spell_id)
    .then(function(res) {
        return res.text();
    }).then(function(body) {
        
       // console.log(body);
        
        var result = '';
        
        
        var $ = cheerio.load(body);
        
        try{
        var str = $.html();
        }
        catch(err)
        {
          console.log(err);  
        }

        try{
            
             data = {};
             data.id = params.spell_id;
             data.name = $('h1.heading-size-1').html();
            
            spell_cache[params.spell_id] = data.name;
            
        return callback(data); 
        
        }
        catch(err)
        {
          console.log(err);  
        }

        });
       
    }
    catch(err) {
    console.log(err.message);
    }   
    
}; 
 


function search_creature(params, callback){
    
    try{
        if(typeof(params)==='undefined')
        { 
            console.log('wft');
            return;
        }

            var id = params.creature_id;

            db.query(
                'SELECT * FROM creature_template WHERE entry =' + id, 
                function(err,rows){
                  if(err) throw err;
                 return callback(rows);
                });


         return;
    }
    catch(err) {
    console.log(err.message);
    }   
    
};

function search_creature_name(params, callback){
    
    try{
        if(typeof(params)==='undefined')
        { 
            console.log('wft');
            return;
        }

            var name = params.creature_name;

                console.log(name);

            db.query(
                'SELECT * FROM creature_template WHERE name LIKE ?', '%'+name+'%',
                function(err,rows){
                  if(err) throw err;
                 return callback(rows);
                });


         return;
    }
    catch(err) {
    console.log(err.message);
    }   
    
};



function search_creature_text(params, callback){
    
    try{
        if(typeof(params)==='undefined')
        { 
            console.log('wft');
            return;
        }

            var id = params.creature_id;

            db.query(
                'SELECT * FROM `creature_text` WHERE entry =' + id, 
                function(err,rows){
                  if(err) throw err;
                  callback(rows);
                });


         return;
    }
    catch(err) {
    console.log(err.message);
    }   
    
};


function search_gameobject(params, callback){
    
    try{
        if(typeof(params)==='undefined')
        { 
            console.log('wft');
            return;
        }

            var id = params.gameobject_id;

            db.query(
                'SELECT * FROM gameobject_template WHERE entry =' + id, 
                function(err,rows){
                  if(err) throw err;
                  callback(rows);
                });


         return;
    }
    catch(err) {
    console.log(err.message);
    }   
    
};


function search_sai(params, callback){
    
    try{
        if(typeof(params)==='undefined')
        { 
            console.log('wft');
            return;
        }

            var entry_id = params.entry_id;
            var source_type = params.source_type;

          //  console.log(entry_id);
         //   console.log(source_type);

            db.query(
                'SELECT * FROM `smart_scripts` WHERE `entryorguid` = '+entry_id+' and `source_type` = '+source_type+';', 
                function(err,rows){
                  if(err) throw err;
                  callback(rows);
                });


         return;
    }
    catch(err) {
    console.log(err.message);
    }   
    
};


function setup_sai(sai_data)
{
     try{
        if(typeof(sai_data)==='undefined')
        { 
            console.log('wft');
            return;
        }
        
          switch(sai_data[0].source_type) {
                    case 0: //Creature
                        var db_query = "UPDATE `creature_template` SET `AIName` = 'SmartAI' WHERE `entry` = "+sai_data[0].entryorguid+" ;";
                        break;
                    case 1: // GO
                        var db_query = "UPDATE `gameobject_template` SET `AIName` = 'SmartGameObjectAI' WHERE `entry` = "+sai_data[0].entryorguid+" ;";
                        break;
                    case 2: //AreaTrigger
                        var db_query = "REPLACE INTO `areatrigger_scripts` (`entry`, `ScriptName`) VALUES("+sai_data[0].entryorguid+",'SmartTrigger');";
                        break; 
                    case 9: //TimedActionList
                        var db_query = "";
                        break;
                    default:
                        break;
                } 
        
                    if(sai_data[0].source_type!==9)
                    {  
                      db.query(db_query, function(err, result) {
                        if (err) throw err;
                           // console.log('Seted up SAI');
                            return;
                       });
                    }
         return;
    }
    catch(err) {
    console.log(err.message);
    } 
}

function clean_up_sai(sai_data,callback)
{
    try{
        if(typeof(sai_data)==='undefined')
        { 
            console.log('wft');
            return;
        }
        
          db.query('DELETE FROM smart_scripts WHERE (source_type = '+sai_data[0].source_type+' AND entryorguid = '+sai_data[0].entryorguid+');', function(err, result) {
            if (err) throw err;
                return callback(sai_data);
                });
        
         return;
    }
    catch(err) {
    console.log(err.message);
    } 
};


function run_script(sai_data){
    
       try{
        if(typeof(sai_data)==='undefined')
        { 
            console.log('wft');
            return;
        }
        
        setup_sai(sai_data);
        

        for(var i=0; i < sai_data.length; i++)
               {
                   
                       var post  = sai_data[i];

                       db.query('INSERT INTO smart_scripts SET ?', post, function(err, result) {
                          if (err) throw err;
                        });
                } 
         return;
    }
    catch(err) {
    console.log(err.message);
    }   
};


function run_text(text_data){
    
       try{
        if(typeof(text_data)==='undefined')
        { 
            console.log('wft');
            return;
        }
        
        for(var i=0; i < text_data.length; i++)
               {
                   
                       var post  = text_data[i];

                       db.query('REPLACE INTO `creature_text` SET ?', post, function(err, result) {
                          if (err) throw err;
                        });

                } 
         return;
    }
    catch(err) {
    console.log(err.message);
    }   
};




function run_creature_template(creature_data,callback)
{
    try{
        if(typeof(sai_data)==='undefined')
        { 
            console.log('wft');
            return;
        }
 

        
        
        
        
        
        
        
          db.query('DELETE FROM smart_scripts WHERE (source_type = '+sai_data[0].source_type+' AND entryorguid = '+sai_data[0].entryorguid+');', function(err, result) {
            if (err) throw err;
                return callback(sai_data);
                });
        
         return;
    }
    catch(err) {
    console.log(err.message);
    } 
};

module.exports.search_gameobject = search_gameobject;
module.exports.search_creature = search_creature;
module.exports.search_creature_name = search_creature_name;
module.exports.search_creature_text = search_creature_text;
module.exports.search_sai = search_sai;
module.exports.run_script = run_script;
module.exports.run_creature_template = run_creature_template;
module.exports.run_text = run_text;
module.exports.clean_up_sai = clean_up_sai;
module.exports.search_spell = search_spell;
