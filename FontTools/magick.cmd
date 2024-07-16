%1 %2 ( +clone -negate -morphology Distance Euclidean:4 -level 50%%,-50%% ) -morphology Distance Euclidean:4 -compose Plus -composite -level 47%%,53%% -negate -filter Jinc -resize 25%% %3
