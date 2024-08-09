# Python Scripts

## BERT Script

The file `bert_property_diagnosticity.ipynb` was used in experiment 2 to test whether some of the properties we used we more diagnostic than others. The script is set up to query bert-large and bert-base by presenting the model with "An animal that [property type] is a" where property type corresponds to each property used in the experiment (4 biological, 4 behavioral, 4 purpose and 4 social). The model returns a completion and the probability assigned to the completion.

## RoBERTa Script

The file `roberta_property_diagnosticity.ipynb` works in the same way as the one above except that it uses RoBERTa instead of BERT.