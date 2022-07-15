pragma solidity 0.8.4;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract Token {
        using SafeMath for uint;

        address owner;
        string public name;
        string public symbol;
        uint256 public totalSupply;
        uint256 public decimal;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    

    event Transfer(address indexed from, address indexed to, uint256 value);

    event Approval(
        address indexed _owner,
        address indexed _spender,
        uint256 _value
    );



    constructor() {
        name = "Solid Token";
        symbol = "STKN";
        totalSupply = 20000000 * (10 ** 18);
        decimal = 18;
        balanceOf[msg.sender] = totalSupply;
    }

    modifier onlyOwner {
        require(msg.sender == owner, "you are not the owner");
        _;
    }

    function transfer(address _to, uint256 _value) external returns (bool success) {
        require(_to != address(0));
        require(balanceOf[msg.sender] >= _value, "insufficient funds");
        balanceOf[msg.sender] = balanceOf[msg.sender].sub(_value);
        balanceOf[_to] = balanceOf[_to].add(_value);
        return true;
        emit Transfer(msg.sender, _to, _value);
    }

    function approve(address _spender, uint256 _value) public returns (bool success) {
        allowance[msg.sender][_spender] = _value;    
        emit Approval(msg.sender, _spender, _value);

        return true;
    }

    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success) {
        require(_value <= balanceOf[_from], "From have Insufficient balance");
        require(_value <= allowance[_from][msg.sender], "insufficient Allowance from `From`");
        balanceOf[_from] = balanceOf[_from].sub(_value);
        balanceOf[_to] = balanceOf[_to].add(_value);

        allowance[_from][msg.sender] = allowance[_from][msg.sender].sub(_value) ;

        emit Transfer(_from, _to, _value);

        return true;

    }

}