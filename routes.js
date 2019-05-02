const mongoose = require('mongoose');
const mongo = require('mongodb');
const randomWords = require('random-words');
const Sentencer = require('sentencer');
const search = require('image-search');
const request = require("request");
const Parser = require("google-search-parser2");
const translate_old = require("translate");
const translate = require('@vitalets/google-translate-api');
const User = require('./models/User.js');
const Word = require('./models/Word.js');
const Language = require('./models/Language.js');
const imageDataURI = require("image-data-uri");
const posTagger = require( 'wink-pos-tagger' );

module.exports = function(app, db) {
    app.route('/signup/google').post((req, res) => {
        return User.findOne({
            user_id: req.body.id
        }).then(user => {
            if (user) {
                res.send(user);
            } else {
                const user = new User({
                    user_id: req.body.id,
                    display_name: req.body.displayName,
                    words_visited: 0,
                    points: 0
                });
                return user.save().then(ress => {
                    console.log({
                        ...ress._doc
                    })
                    res.send(JSON.stringify(user))
                    // res.json({...res._doc})
                });
            }
        });
    })
    // app.route('/auth/google/callback').get(passport.authenticate('google', { failureRedirect: '/'}), function(req, res){
    //   return User.findOne({user_id: req.user.id}).then(user => {
    //   if(user){
    //     res.send(user.user_id);
    //   }
    //     else{
    //   const user = new User({
    //     user_id: req.user.id,
    //     display_name: req.user.displayName,
    //     mode: 'G',
    //     points: 0
    //   });
    //   return user.save().then(ress => {
    //                     console.log({...ress._doc})
    //                     res.send(user.user_id)
    //                     // res.json({...res._doc})
    //                 });
    //     }});
    // });
    function oldword(count){
      Word.find({count: count}, function(err, word) {
              if (err) throw err;
              return(word);
          });
    }
  app.get('/test', function(req, res){
    let word = Sentencer.make("{{ noun }}")
    var tagger = posTagger();
    res.send({word: word, 
              pos: tagger.tagSentence(word)[0].pos});
  });
  
  app.post('/one-word', function(req, res){
    translate(req.body.word, {
                from: 'en',
                to: req.body.lang
            }).then(ans => {      
      res.send(ans);
    });
  });
  
    function newword(lang1, lang2){
      
      return new Promise((res, rej) => {
        let word = Sentencer.make("{{ noun }}");
        let flag = true
        while(flag){
          console.log(word);
          return Word.findOne({word: word}, async function(err, doc){
            console.log('reached here')
            if(doc){
              console.log('reached here 1')
              word = await Sentencer.make("{{ noun }}");
            }
            else{
              translate(word, {
              from: 'en',
              to: lang1
          }).then(word1 => {
              translate(word, {
                  from: 'en',
                  to: lang2
              }).then(word2 => {
                  console.log(word1.text, word2.text);
                  var parser = new Parser(request);
                  parser.parseImageUrls(word, async function(urls) {
                      let number = await Word.count();
                      let word_save = new Word({
                          word: word,
                          url: urls[0].url,
                          count: number
                      });
                      return word_save.save((err, docs) => {
                          if (err) {
                              console.log(
                                  "Save kyun nahin hua behenchod"
                              );
                          } else if (!err) {
                              console.log({
                                  eng: word,
                                  url: urls[0].url,
                                  word1: word1.text,
                                  word2: word2.text
                              });
                              res({
                                  eng: word,
                                  url: urls[0].url,
                                  word1: word1.text,
                                  word2: word2.text
                              })
                          }
                      });
                  })
              }).catch(err => {
                  rej(err);
              });
          });
              flag = false;
            }
              console.log('reached here 345')
          });
        }
        console.log(word);
          
        
      });
      
    }
  
  
    app.post('/add-word', function(req, res){
      console.log("Got image chutiya!");
      console.log(req.body.word);
      Word.find({word: req.body.word}, function(err, resword){
        if(err || req.body.word == "" || req.body.word == undefined){
          console.log("Bruh, the fuck?")
        }else if(resword.length == 0){
          console.log("Word nahin hai");
          var parser = new Parser(request);
            parser.parseImageUrls(req.body.word, async function(urls) {
            res.send({flag: true, data: [urls[0].url, urls[1].url, urls[2].url, urls[3].url, urls[4].url, urls[5].url]})
          });
        }else{
          console.log("Switch to game page, ma nigga");
          console.log(resword);
          res.send({flag: false, data: resword});
        }
      });
    });
  
    app.post('/db-word', function(req, res){
      let toadd = new Word({
        url: req.body.url,
        word: req.body.word,
        count: Word.count(),
        [req.body.lang.toLowerCase().slice(0,2)]: [{
          word: req.body.tran,
          count: 1,
          audio: req.body.audio
        }]
      });
      console.log(toadd)
      toadd.save(function(err, doc){
        if(err){
          console.log("GGWP", err)
        }else{
          console.log(doc);
        Language.findOne({}, function(err, obj) {
            if (obj.languages.includes(req.body.lang)) {
                obj.words[obj.languages.indexOf(req.body.lang)]++;
            } else {
                obj.languages.push(req.body.lang);
                obj.words.push(1);
            }
            obj.markModified("languages");
            obj.markModified("words");
            obj.save((err, docu) => {
                res.send(toadd);
            });
        });
        }
      });
    });
  
    app.get('/privacy', function(req, res) {
        res.sendFile(__dirname + '/views/privacy.html');
    });
    app.get('/leaderboard', function(req, res) {
        return User.find().sort({points: -1})
            .then(ress => res.send(JSON.stringify(ress)))
    });
    app.post('/skip', function(req, res) {
        User.findOne({
        user_id: req.body.user_id
      }, function(err, user) {
        if(err){
          console.log("Kya fake user bheja")
        }else if(!user){
          console.log("Lels. GG bruh");
        }else{
          user.words_visited += 1;
          user.save((err, docu) => {
              res.send(docu);
          });
        }
      });
    });
  
    app.route('/word').get(function(req, res){
      User.findOne({
        user_id: req.query.user_id
      }, function(err, user) {
        if(err){
          console.log("Kya fake user bheja")
        }else{
        Word.findOne({count: user.words_visited}, async function(err2, wordlist){
          if(err){
            console.log("GG ho gaya na");
          }else if(!wordlist || wordlist.length == 0){
            console.log("sdfsgs");
            return res.send(await newword(req.query.lang1, req.query.lang2));
          }else{
            //res.send(wordlist);
            console.log("Get ready to translate");
            translate(wordlist.word, {
              from: 'en',
              to: req.query.lang1
          }).then(word1 => {
              translate(wordlist.word, {
                  from: 'en',
                  to: req.query.lang2
              }).then(word2 => {
                  console.log("lels" + word1.text + word2.text);
                  console.log(wordlist);
                  res.send({...wordlist._doc, eng: wordlist._doc.word, word1: word1.text, word2: word2.text});
              });
              })
          }
        });
        }
      });  
    });
  
    app.route('/points').post(function(req, res) {
        console.log(req.body.user_id);
        User.findOne({
            user_id: req.body.user_id
        }, function(err, user) {
            if (err) {
                throw (err)
            } else if (!user) {
                res.send({
                    points: 0
                });
            } else {
                res.send({
                    points: user.points
                });
            }
        });
    });
    app.route('/answer').post((req, res) => {
      console.log(req.body.lang, req.body.word, req.body.user_id);
        User.findOne({
            user_id: req.body.user_id
        }, function(err, user) {
            if (err) {
                console.log("Kya chutiya hai");
            } else if (!user) {
                console.log("BC user nahin mila", req.body.user_id);
            } else {
                console.log("user hai");
                user.points += 5;
                user.words_visited += 1;
                user.save();
                Word.findOne({
                    word: req.body.word,
                    [req.body.lang.toLowerCase().slice(0,2)]: {
                        $exists: true
                    }
                }, function(err, word) {
                    if (err) {
                        console.log("Kaafi chutiya");
                    } else if (!word) {
                        console.log(
                            "Word toh must be there. Language aint. Add kar bc"
                        );
                        let setObject = {};
                        console.log(req.body.audio);
                        setObject[req.body.lang.toLowerCase().slice(0,2)] = [{
                            word: req.body.tran,
                            count: 1,
                            audio: req.body.audio
                        }];
                        Word.findOneAndUpdate({
                            word: req.body.word
                        }, {
                            $set: setObject
                        }, function(err, result) {
                            Language.findOne({}, function(err, obj) {
                                if (obj.languages.includes(req
                                        .body.lang)) {
                                    obj.words[obj.languages
                                        .indexOf(req.body
                                            .lang)]++;
                                } else {
                                    obj.languages.push(req.body
                                        .lang);
                                    obj.words.push(1);
                                }
                                obj.markModified("languages");
                                obj.markModified("words");
                                obj.save((err, docu) => {
                                    res.send(result);
                                });
                            });
                        });
                    } else {
                      console.log("okay we're here houston");
                        let data = (JSON.parse(JSON.stringify(word))[req.body
                            .lang.toLowerCase().slice(0,2)]);
                        let flag = false;
                        for (let i = 0; i < data.length; i++) {
                            if (data[i].word == req.body.tran) {
                                data[i].count++;
                                flag = true;
                            }
                        }
                        if (!flag) {
                            data.push({
                                word: req.body.tran,
                                count: 1,
                                audio: req.body.audio
                            })
                        };
                        let setObject = {};
                        setObject[req.body.lang.toLowerCase().slice(0,2)] = data;
                        Word.findOneAndUpdate({
                            word: req.body.word
                        }, {
                            $set: setObject
                        }, function(err, result) {
                            Language.findOne({}, function(err, obj) {
                                if (obj.languages.includes(req
                                        .body.lang)) {
                                    obj.words[obj.languages
                                        .indexOf(req.body
                                            .lang)]++;
                                } else {
                                    obj.languages.push(req.body
                                        .lang);
                                    obj.words.push(1);
                                }
                                obj.markModified("languages");
                                obj.markModified("words");
                                obj.save((err, docu) => {
                                    res.send(result);
                                });
                            });
                        });
                    }
                })
            }
        })
    });
    app.route('/languages').get((req, res) => {
      Language.findOne({}, function(err, rec){
        if(err){
          console.log("Ye bhi fuck kar diya. Haha.");
        }
        else if(rec.length == 0){
          console.log("Lol, what's the issue here?");
        }else{
          res.send(rec.languages);
        }
      });
    });
    
    app.route('/addlang').post((req, res) => {
      Language.findOne({}, function(err, rec){
        if(err){
          console.log("Ye bhi fuck kar diya. Lels. Chutiya.");
        }
        else if(rec.length == 0){
          console.log("Lol, what's the issue here bruh....?");
        }else{
          if(!rec.languages.includes(req.body.lang)){
            rec.languages.push(req.body.lang);
            rec.words.push(0);
            rec.markModified();
            rec.save((err, doc) => {
            //console.log("Got a new language motherfucker");
            res.send(req.body.lang);
            });
          }
          else{
            console.log("Lol chutiya pagal");
          }
        }
      });
    });
  
    app.route('/translate').post((req, res) => {
        if (req.body.from == "en") {
            Word.findOne({
                word: req.body.word,
                [req.body.to.toLowerCase().slice(0,2)]: {
                    $exists: true
                }
            }, function(err, record) {
                if (err) {
                    console.log("Satyanash");
                } else if (!record) {
                    res.send("We don't got the word yo");
                } else {
                    let recs = JSON.parse(JSON.stringify(record))[req.body.to];
                    let max = 0;
                    for (let i = 0; i < recs.length; i++) {
                        if (recs[i].count > recs[max].count) {
                            max = i;
                        }
                    }
                    res.send(JSON.stringify(recs[max]));
                }
            });
        } else {
            translate(req.body.word, {
                from: req.body.from,
                to: "en"
            }).then(word1 => {
                Word.findOne({
                    word: word1.text,
                    [req.body.to]: {
                        $exists: true
                    }
                }, function(err, record) {
                    if (err) {
                        console.log("Satyanash");
                    } else if (!record) {
                        res.send("We don't got the word yo");
                    } else {
                        let recs = JSON.parse(JSON.stringify(record))[req.body
                            .to];
                        let max = 0;
                        for (let i = 0; i < recs.length; i++) {
                            if (recs[i].count > recs[max].count) {
                                max = i;
                            }
                        }
                        res.send(JSON.stringify(recs[max]));
                    }
                });
            });
        }
    });
    app.get('/', function(request, response) {
        response.sendFile(__dirname + '/views/index.html');
    });
}